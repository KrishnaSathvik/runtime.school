/**
 * M15 Advanced Functions & Recursion: five lessons (PY-L15-01 … PY-L15-05).
 *
 * Functions that take any number of positional arguments (`*args`, collected into a **tuple**) and named arguments
 * (`**kwargs`, collected into a dictionary) (01); options that must be passed by name (02); `lambda` as a short inline
 * key or argument, never assigned to a name (03); closures that remember settings or state, with `nonlocal` (04); and
 * recursion over genuinely nested data (category trees, folders), with a base case and the recursion limit (05).
 * Fixtures: BTS flights (D13), NOAA stations and readings (D07), Runtime Market invoices and categories (R01-shaped).
 *
 * Challenges are graded by calling the learner's functions with public and hidden inputs. Factories that return
 * functions (closures) are graded with expression checks that build a function and call it several times.
 * Version 2: rewritten from a print-one-value module; saved progress from version 1 does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, pv, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

/** An expression check: runs `code` after the learner's program; `result` must equal `expected`. */
const call = (id: string, label: string, code: string, expected: unknown, opts: { hidden?: boolean; show?: string } = {}) => ({
  kind: "expr" as const,
  id,
  label,
  expr: code,
  expected: pv(expected),
  ...(opts.show ? { show: opts.show } : {}),
  ...(opts.hidden ? { hidden: true } : {}),
});

// ---------------------------------------------------------------- shared fixtures

const leaguePlayers = [
  { name: "Nora", points: 40, wins: 3 },
  { name: "Theo", points: 55, wins: 2 },
  { name: "Grace", points: 40, wins: 5 },
  { name: "Jamal", points: 31, wins: 4 },
];

const stations = [
  { name: "Great Falls Airport", lat: 47.47, lon: -111.38 },
  { name: "Boston Logan", lat: 42.36, lon: -71.01 },
  { name: "Atlanta Hartsfield", lat: 33.64, lon: -84.43 },
];

const leaf = (name: string, files: string[] = []) => ({ name, files, folders: [] as unknown[] });
const projectTree = { name: "shop", files: ["README.md"], folders: [{ name: "data", files: ["orders.csv"], folders: [leaf("2024", ["jan.csv"]), leaf("2025")] }, leaf("docs", ["guide.md"])] };

const cat = (name: string, children: unknown[] = []) => ({ name, children });
const menu = cat("All", [cat("Electronics", [cat("Audio", [cat("Headphones")]), cat("Cameras")]), cat("Home")]);

export const m15Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L15-01 *args and **kwargs
  {
    id: "PY-L15-01",
    version: 2,
    slug: "extra-arguments",
    title: "Any number of arguments: *args and **kwargs",
    lede: "A starred parameter collects any number of positional arguments into a tuple; a double-starred one collects named arguments into a dictionary.",
    focus: "Write functions that accept any number of positional arguments (*args, a tuple) or named arguments (**kwargs, a dictionary).",
    minutes: 17,
    objectives: [
      "Collect extra positional arguments with `*name`, and know that they arrive as a **tuple**",
      "Collect named arguments with `**name` as a dictionary, and walk it with `items()`",
      "Spread a list into separate arguments with `*` and a dictionary into named ones with `**` at the call",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "assignment", "list-literal", "list-index", "list-comp", "comp-if", "list-mutate", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "dict-iterate", "string-index", "string-format", "aggregate-call", "all-call", "len-call", "arithmetic", "comparison", "logical", "none-value", "identity", "if-statement", "truthiness", "type-call", "for-loop", "membership", "print-call", "print-several", "print-text", "unquoted-name", "top-level-indent", "runtime-error", "conditional-expr", "reassignment", "nested-loop", "dict-comp", "boolean", "conversion", "continue-statement"],
    teaches: ["star-args", "star-kwargs"],
    blocks: [
      {
        kind: "text",
        md: "`print` takes one value or ten; `max` takes two numbers or twenty. Your own functions can do the same. A parameter written with one star, `*readings`, collects every extra positional argument into a **tuple**, an unchangeable sequence you can loop over, index, and pass to `sum` or `len`. With no extra arguments it is an empty tuple, never missing.",
      },
      {
        kind: "example",
        title: "The average of any number of readings",
        code: src`
def average(*readings):
    print(type(readings), readings)
    if not readings:
        return None
    return sum(readings) / len(readings)

print(average(6.0, 7.5, 3.0))
print(average())
week = [4.0, 6.0]
print(average(*week))
`,
        output: "<class 'tuple'> (6.0, 7.5, 3.0)\n5.5\n<class 'tuple'> ()\nNone\n<class 'tuple'> (4.0, 6.0)\n5.0\n",
        note: "`average(*week)` is the other direction: a star **at the call** spreads a list into separate arguments, so the function sees `average(4.0, 6.0)`. Without the star it would receive one argument, the list itself.",
      },
      {
        kind: "text",
        md: "Because `*args` is a tuple, it can't be changed in place. Build a new list from it if you need to add or remove items.",
      },
      {
        kind: "error-example",
        title: "Appending to the collected arguments",
        code: src`
def add_tags(*tags):
    tags.append("new")
    return tags

print(add_tags("sale", "summer"))
`,
        error: "AttributeError",
        output: "",
        note: "`AttributeError: 'tuple' object has no attribute 'append'`. `list(tags)` makes a list you can change.",
      },
      {
        kind: "text",
        md: "Two stars, `**conditions`, collect every **named** argument the definition doesn't list into a dictionary: the names become keys. This is how search functions accept whichever filters the caller cares about. In a definition the order is fixed: ordinary parameters, then `*args`, then any parameters with defaults, then `**kwargs`.",
      },
      {
        kind: "example",
        title: "Search flights by any fields",
        code: src`
def find_flights(flights, **conditions):
    return [f["flight"] for f in flights if all(f[field] == value for field, value in conditions.items())]

flights = [
    {"flight": "UA2017", "origin": "LAS", "airline": "UA"},
    {"flight": "MQ3443", "origin": "MCI", "airline": "MQ"},
    {"flight": "UA1552", "origin": "LAS", "airline": "UA"},
    {"flight": "DL1270", "origin": "PDX", "airline": "DL"},
]
print(find_flights(flights, origin="LAS"))
print(find_flights(flights, origin="LAS", airline="DL"))
print(find_flights(flights))
`,
        output: "['UA2017', 'UA1552']\n[]\n['UA2017', 'MQ3443', 'UA1552', 'DL1270']\n",
        note: "With no conditions, `conditions` is `{}` and `all` of nothing is True, so every flight matches: a sensible *no filter* result.",
      },
      {
        kind: "text",
        md: "**When to use it:** when callers naturally pass a varying number of similar values (`average(…)`, `merge_tags(…)`), or optional named settings you pass along. **Mistakes to avoid:** treating `*args` as a list (it is a tuple, so `append` fails); forgetting the star at the call (`average(week)` passes one list); and reaching for `*args` when a single list parameter would be clearer, for example when the caller already has the values in a list.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Weigh any number of parcels",
      prompt: "`total_weight` only accepts two parcels. Change its parameters so it accepts any number of weights, and return their total.",
      spec: [
        ["Function", "`total_weight(*weights)`"],
        ["Returns", "the sum of every weight passed; 0 for none"],
      ],
      starter: src`
def total_weight(first, second):
    return first + second

print(total_weight(2.5, 1.0, 4.0))
`,
      answer: src`
def total_weight(*weights):
    return sum(weights)

print(total_weight(2.5, 1.0, 4.0))
`,
      wrong: [
        {
          code: src`
def total_weight(*weights):
    return 7.5
`,
          fails: ["returns"],
          why: "the total is typed in instead of added up",
        },
      ],
      hints: ["One starred parameter replaces both named ones.", "Inside the function it is a tuple of every weight.", "`sum` adds a tuple, and gives 0 for an empty one."],
      task: {
        checks: [
          fn("returns", "total_weight", [
            example([2.5, 1.0, 4.0], 7.5),
            hiddenCase("no parcels", [], 0),
            hiddenCase("one parcel", [3], 3),
          ], { label: "total_weight() adds every weight", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Merge tag lists",
        prompt: "A product page combines tags from several places: the supplier's list, the editor's list, customers' lists. Write `merge_tags(*tag_lists)`: accept any number of tag lists and return one list of every tag, each **once**, in the order it first appears across the lists.",
        spec: [
          ["Function", "`merge_tags(*tag_lists)`"],
          ["tag_lists", "any number of lists of texts (possibly none)"],
          ["Returns", "a new list of distinct tags in first-seen order; `[]` when called with no lists"],
          ["Example", "`merge_tags([\"sale\", \"summer\"], [\"summer\", \"new\"])` → `['sale', 'summer', 'new']`"],
        ],
        starter: src`
def merge_tags(*tag_lists):
    return []

print(merge_tags(["sale", "summer"], ["summer", "new"]))
`,
        answer: src`
def merge_tags(*tag_lists):
    merged = []
    for tags in tag_lists:
        for tag in tags:
            if tag not in merged:
                merged.append(tag)
    return merged

print(merge_tags(["sale", "summer"], ["summer", "new"]))
`,
        alternatives: [
          src`
def merge_tags(*tag_lists):
    seen = {tag: True for tags in tag_lists for tag in tags}
    return list(seen)
`,
        ],
        wrong: [
          {
            code: src`
def merge_tags(tag_lists):
    merged = []
    for tags in tag_lists:
        for tag in tags:
            if tag not in merged:
                merged.append(tag)
    return merged
`,
            fails: ["returns"],
            why: "without the star it accepts exactly one argument, so two lists raise TypeError",
          },
          {
            code: src`
def merge_tags(*tag_lists):
    return sorted({tag for tags in tag_lists for tag in tags})
`,
            fails: ["returns"],
            why: "a set loses the first-seen order, and sorting makes it alphabetical",
          },
          {
            code: src`
def merge_tags(*tag_lists):
    return [tag for tags in tag_lists for tag in tags]
`,
            fails: ["returns"],
            why: "repeated tags are kept",
          },
        ],
        hints: [
          "The starred parameter is a tuple of lists: one loop walks the lists, a second walks each list's tags.",
          "Keep a result list and add a tag only when it isn't already there.",
          "Called with no lists, the tuple is empty, the loops never run, and the empty result is already right.",
        ],
        task: {
          checks: [
            fn("returns", "merge_tags", [
              example([["sale", "summer"], ["summer", "new"]], ["sale", "summer", "new"]),
              example([["gift"]], ["gift"]),
              example([], []),
              hiddenCase("three lists", [["a"], ["b", "a"], ["c", "b"]], ["a", "b", "c"]),
              hiddenCase("a repeat inside one list", [["x", "x", "y"]], ["x", "y"]),
              hiddenCase("an empty list among others", [[], ["p"], []], ["p"]),
            ], { label: "merge_tags() merges any number of lists, each tag once" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Build a search URL",
        prompt: "A web app builds search links such as `/flights?origin=LAS&airline=UA`. Write `build_query(base, **params)`: append each named parameter as `name=value`, joined with `&`, after a `?`, in the order they were passed. Parameters whose value is `None` were left blank by the user and are skipped. With nothing left to add, return `base` unchanged.",
        spec: [
          ["Function", "`build_query(base, **params)`"],
          ["Returns", "text such as `\"/flights?origin=LAS&page=2\"`"],
          ["Joining", "`\"&\".join(pieces)` glues a list of texts together with `&` between them"],
          ["Example", "`build_query(\"/flights\", origin=\"LAS\", airline=None, page=2)` → `'/flights?origin=LAS&page=2'`"],
        ],
        starter: src`
def build_query(base, **params):
    return base

print(build_query("/flights", origin="LAS", airline=None, page=2))
print(build_query("/flights"))
`,
        answer: src`
def build_query(base, **params):
    pieces = [f"{name}={value}" for name, value in params.items() if value is not None]
    if not pieces:
        return base
    return base + "?" + "&".join(pieces)

print(build_query("/flights", origin="LAS", airline=None, page=2))
print(build_query("/flights"))
`,
        alternatives: [
          src`
def build_query(base, **params):
    query = ""
    for name, value in params.items():
        if value is None:
            continue
        if query:
            query += "&"
        query += name + "=" + str(value)
    if query == "":
        return base
    return base + "?" + query
`,
        ],
        wrong: [
          {
            code: src`
def build_query(base, **params):
    pieces = [f"{name}={value}" for name, value in params.items()]
    return base + "?" + "&".join(pieces)
`,
            fails: ["returns"],
            why: "blank parameters appear as `airline=None`, and a link with no parameters ends in a stray `?`",
          },
          {
            code: src`
def build_query(base, **params):
    pieces = [f"{name}={value}" for name, value in params.items() if value]
    if not pieces:
        return base
    return base + "?" + "&".join(pieces)
`,
            fails: ["returns"],
            why: "testing truthiness also drops real values such as `page=0`",
          },
        ],
        hints: [
          "`params` is a dictionary of the named arguments, in the order they were passed.",
          "Build `name=value` pieces for the values that are not None (`is not None`, so 0 and empty texts still count).",
          "Decide between returning `base` alone and `base` with `?` and the joined pieces.",
        ],
        task: {
          checks: [
            fn("returns", "build_query", [
              example(["/flights"], "/flights?origin=LAS&page=2", { kwargs: { origin: "LAS", airline: null, page: 2 } }),
              example(["/flights"], "/flights"),
              example(["/films"], "/films?year=2023", { kwargs: { year: 2023 } }),
              hiddenCase("every parameter blank", ["/search"], "/search", { kwargs: { q: null, sort: null } }),
              hiddenCase("a value of zero", ["/orders"], "/orders?page=0&size=20", { kwargs: { page: 0, size: 20 } }),
              hiddenCase("three parameters in the order given", ["/r"], "/r?z=1&a=2&m=3", { kwargs: { z: 1, a: 2, m: 3 } }),
            ], { label: "build_query() adds the non-blank parameters in order" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def describe(first, *rest, **options):
    print(first, rest, options)

describe("UA2017", "LAS", "IAH", late=True)
`,
        choices: ["UA2017 ('LAS', 'IAH') {'late': True}", "UA2017 ['LAS', 'IAH'] {'late': True}", "UA2017 LAS IAH True", "('UA2017', 'LAS', 'IAH') {'late': True}"],
        answer: 0,
        why: "The first positional argument fills `first`; the remaining positional ones are collected into a tuple; the named one goes into the dictionary.",
      },
      {
        id: "q2",
        prompt: "A common mistake: forgetting the star at the call. What does this print?",
        program: src`
def count(*items):
    return len(items)

prices = [7.49, 31.0, 171.99]
print(count(prices), count(*prices))
`,
        choices: ["1 3", "3 3", "3 1", "1 1"],
        answer: 0,
        why: "`count(prices)` passes one argument, the list, so the tuple holds one item. `count(*prices)` spreads the list into three arguments.",
      },
      {
        id: "q3",
        prompt: "What kind of value is `args` inside `def f(*args):`?",
        choices: ["A tuple", "A list", "A dictionary", "A set"],
        answer: 0,
        why: "Extra positional arguments are always collected into a tuple. Named ones (`**kwargs`) are collected into a dictionary.",
      },
    ],
    review: [
      "`*args` collects extra positional arguments into a tuple (empty when there are none).",
      "`**kwargs` collects extra named arguments into a dictionary; walk it with `items()`.",
      "At a call, `*list` spreads a list into arguments and `**dict` spreads a dictionary into named ones.",
      "Next: parameters that must be passed by name, so calls stay readable.",
    ],
  },

  // ------------------------------------------------------------------ PY-L15-02 keyword-only
  {
    id: "PY-L15-02",
    version: 2,
    slug: "keyword-only",
    title: "Options that must be named",
    lede: "Parameters after a bare `*` can only be passed by name. Calls like `convert(100, rate=0.92)` stay readable, and a mixed-up argument order becomes an error instead of a wrong answer.",
    focus: "Make options keyword-only with a bare * so every call names them.",
    minutes: 15,
    objectives: [
      "Write `def f(data, *, option)` so `option` must be passed by name",
      "Combine keyword-only parameters with defaults",
      "Read the TypeError a positional call produces",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "assignment", "list-literal", "list-index", "list-comp", "tuple-literal", "tuple-unpack", "dict-literal", "dict-lookup", "string-index", "string-slice", "string-format", "aggregate-call", "sort-key", "list-sort", "range-call", "arithmetic", "precedence", "comparison", "if-statement", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "boolean", "conditional-expr", "len-call", "print-text", "reassignment", "enumerate-call", "comp-if", "logical", "while-loop", "nested-loop", "list-mutate"],
    teaches: ["keyword-only"],
    blocks: [
      {
        kind: "text",
        md: "Compare `export(rows, True, False)` with `export(rows, header=True, overwrite=False)`. The first call is a puzzle: which `True` is which? And if someone swaps them, the program silently does the wrong thing.\n\nA bare `*` in the parameter list says: **everything after this must be passed by name**. It collects nothing; it only draws the line.",
      },
      {
        kind: "error-example",
        title: "A rate passed by position",
        code: src`
def convert(amount, *, rate):
    return amount * rate

print(convert(100, 0.92))
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: convert() takes 1 positional argument but 2 were given`. The mistake is caught at the call instead of producing a wrong amount.",
      },
      {
        kind: "example",
        title: "Currency conversion with a named rate",
        code: src`
def convert(amount, *, rate, fee=0):
    return amount * rate - fee

print(convert(100, rate=0.92))
print(convert(100, rate=0.92, fee=1.5))
print(convert(100, fee=1.5, rate=0.92))
`,
        output: "92.0\n90.5\n90.5\n",
        note: "Named arguments can come in any order. `fee` has a default, so it can be left out; `rate` has none, so every call must name it.",
      },
      {
        kind: "text",
        md: "Keyword-only parameters suit **settings**: numbers that would be easy to mix up when they sit side by side. A retry schedule is a good example. After a failed request, a client waits `base`, then twice that, then four times that, never longer than `cap`. Three numbers in a row would be easy to swap; named, they are self-explaining.",
      },
      {
        kind: "example",
        title: "Retry delays, every setting named",
        code: src`
def backoff_delays(*, attempts, base, cap):
    return [min(base * 2 ** i, cap) for i in range(attempts)]

print(backoff_delays(attempts=5, base=1, cap=10))
print(backoff_delays(attempts=3, base=0.5, cap=60))
`,
        output: "[1, 2, 4, 8, 10]\n[0.5, 1.0, 2.0]\n",
        note: "With `*` first, every parameter is keyword-only. `2 ** i` doubles the wait each time, and `min` caps it.",
      },
      {
        kind: "text",
        md: "**When to use it:** flags (`dry_run=True`), and settings of the same type that could be confused (`attempts`, `base`, `cap`). Keep the main data positional: `convert(100, rate=…)` reads naturally. **Mistakes to avoid:** writing `*args` when you only wanted the dividing line (that would also swallow extra positional arguments silently), and putting a keyword-only parameter without a default where most calls want the same value.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A dry run must be named",
      prompt: "`sync(files, dry_run=False)` can be called as `sync(files, True)`, which hides what `True` means. Make `dry_run` keyword-only, so that call raises TypeError and `sync(files, dry_run=True)` still works.",
      spec: [
        ["Function", "`sync(files, *, dry_run=False)`"],
        ["Returns", "`\"would copy NAME\"` per file on a dry run, otherwise `\"copied NAME\"`"],
      ],
      starter: src`
def sync(files, dry_run=False):
    verb = "would copy" if dry_run else "copied"
    return [f"{verb} {name}" for name in files]

print(sync(["orders.csv"], dry_run=True))
`,
      answer: src`
def sync(files, *, dry_run=False):
    verb = "would copy" if dry_run else "copied"
    return [f"{verb} {name}" for name in files]

print(sync(["orders.csv"], dry_run=True))
`,
      wrong: [
        {
          code: src`
def sync(*files, dry_run=False):
    verb = "would copy" if dry_run else "copied"
    return [f"{verb} {name}" for name in files]
`,
          fails: ["returns"],
          why: "`*files` collects every positional argument, so the file list itself arrives wrapped in a tuple",
        },
      ],
      hints: ["The parameter list needs a dividing line before `dry_run`.", "A bare `*` on its own, between two commas, is that line.", "Everything after it must be passed by name."],
      task: {
        checks: [
          fn("returns", "sync", [
            example([["orders.csv"]], ["would copy orders.csv"], { kwargs: { dry_run: true } }),
            example([["a.csv", "b.csv"]], ["copied a.csv", "copied b.csv"]),
            raisesCase([["orders.csv"], true], "TypeError", { label: "dry_run passed by position" }),
          ], { label: "sync() requires dry_run to be named" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "One page of results",
        prompt: "An API returns long result lists one page at a time. Write `page_of(items, *, page, per_page=10)`: return the items on page `page`, counting pages from 1. A page past the end is empty. `page` and `per_page` are both whole numbers, so they must be passed by name to avoid mixing them up.",
        spec: [
          ["Function", "`page_of(items, *, page, per_page=10)`"],
          ["page", "1 for the first page; always at least 1"],
          ["Returns", "a new list with the items of that page; `[]` past the end"],
          ["Example", "`page_of(list(range(1, 26)), page=3)` → `[21, 22, 23, 24, 25]`"],
        ],
        starter: src`
def page_of(items, page, per_page=10):
    return items

print(page_of(list(range(1, 26)), page=3))
print(page_of(["a", "b", "c", "d", "e"], page=2, per_page=2))
`,
        answer: src`
def page_of(items, *, page, per_page=10):
    start = (page - 1) * per_page
    return items[start:start + per_page]

print(page_of(list(range(1, 26)), page=3))
print(page_of(["a", "b", "c", "d", "e"], page=2, per_page=2))
`,
        alternatives: [
          src`
def page_of(items, *, page, per_page=10):
    first = per_page * (page - 1)
    return [item for i, item in enumerate(items) if first <= i < first + per_page]
`,
        ],
        wrong: [
          {
            code: src`
def page_of(items, *, page, per_page=10):
    start = page * per_page
    return items[start:start + per_page]
`,
            fails: ["returns"],
            why: "pages are counted from 0, so `page=1` skips the first page",
          },
          {
            code: src`
def page_of(items, page, per_page=10):
    start = (page - 1) * per_page
    return items[start:start + per_page]
`,
            fails: ["returns"],
            why: "`page` can still be passed by position, so `page_of(items, 2)` is accepted",
          },
        ],
        hints: [
          "Put a bare `*` before `page` so both settings must be named.",
          "Page 1 starts at position 0, page 2 at `per_page`, page 3 at twice that: work out the start from the page number.",
          "A slice past the end of a list is simply empty, so no extra check is needed.",
        ],
        task: {
          checks: [
            fn("returns", "page_of", [
              example([Array.from({ length: 25 }, (_, i) => i + 1)], [21, 22, 23, 24, 25], { kwargs: { page: 3 } }),
              example([["a", "b", "c", "d", "e"]], ["c", "d"], { kwargs: { page: 2, per_page: 2 } }),
              example([["a", "b"]], [], { kwargs: { page: 4 } }),
              hiddenCase("the first page", [["x", "y", "z"]], ["x", "y"], { kwargs: { page: 1, per_page: 2 } }),
              hiddenCase("a page past the end", [[1, 2, 3]], [], { kwargs: { page: 3, per_page: 3 } }),
              raisesCase([[1, 2, 3], 1], "TypeError", { label: "the page passed by position" }),
            ], { label: "page_of() returns the requested page" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Top players by any column",
        prompt: "A league table can be ranked by any numeric column. Write `top_players(players, *, by=\"points\", n=3)`: return the names of the top `n` players by the column named in `by`, highest first; players level on that column are listed alphabetically. Both settings must be passed by name.",
        spec: [
          ["Function", "`top_players(players, *, by=\"points\", n=3)`"],
          ["players", "dictionaries with `name` and numeric columns such as `points` and `wins`"],
          ["Returns", "at most `n` names, highest value of `by` first, ties A–Z"],
          ["Example", "the starter's players → `['Theo', 'Grace', 'Nora']`; with `by=\"wins\", n=2` → `['Grace', 'Jamal']`"],
        ],
        starter: src`
def top_players(players, by="points", n=3):
    return []

players = [
    {"name": "Nora", "points": 40, "wins": 3},
    {"name": "Theo", "points": 55, "wins": 2},
    {"name": "Grace", "points": 40, "wins": 5},
    {"name": "Jamal", "points": 31, "wins": 4},
]
print(top_players(players))
print(top_players(players, by="wins", n=2))
`,
        answer: src`
def top_players(players, *, by="points", n=3):
    ranked = sorted([(-p[by], p["name"]) for p in players])
    return [name for value, name in ranked[:n]]

players = [
    {"name": "Nora", "points": 40, "wins": 3},
    {"name": "Theo", "points": 55, "wins": 2},
    {"name": "Grace", "points": 40, "wins": 5},
    {"name": "Jamal", "points": 31, "wins": 4},
]
print(top_players(players))
print(top_players(players, by="wins", n=2))
`,
        alternatives: [
          src`
def top_players(players, *, by="points", n=3):
    pairs = [(p[by], p["name"]) for p in players]
    names = []
    while pairs and len(names) < n:
        best = pairs[0]
        for pair in pairs:
            if pair[0] > best[0] or (pair[0] == best[0] and pair[1] < best[1]):
                best = pair
        pairs.remove(best)
        names.append(best[1])
    return names
`,
        ],
        wrong: [
          {
            code: src`
def top_players(players, *, by="points", n=3):
    ranked = sorted([(p[by], p["name"]) for p in players], reverse=True)
    return [name for value, name in ranked[:n]]
`,
            fails: ["returns"],
            why: "`reverse=True` also reverses the names, so ties come out Z to A",
          },
          {
            code: src`
def top_players(players, *, by="points", n=3):
    ranked = sorted([(-p["points"], p["name"]) for p in players])
    return [name for value, name in ranked[:n]]
`,
            fails: ["returns"],
            why: "the column is always points, whatever `by` says",
          },
          {
            code: src`
def top_players(players, by="points", n=3):
    ranked = sorted([(-p[by], p["name"]) for p in players])
    return [name for value, name in ranked[:n]]
`,
            fails: ["returns"],
            why: "the settings can still be passed by position",
          },
        ],
        hints: [
          "`by` holds a column name, so `player[by]` reads that column.",
          "Sorting tuples sorts by their first item, then their second: put the negated value first and the name second.",
          "Slice the sorted list to `n` items, then keep only the names; add the bare `*` so both settings are named.",
        ],
        task: {
          checks: [
            fn("returns", "top_players", [
              example([leaguePlayers], ["Theo", "Grace", "Nora"]),
              example([leaguePlayers], ["Grace", "Jamal"], { kwargs: { by: "wins", n: 2 } }),
              example([[]], []),
              hiddenCase("n larger than the league", [leaguePlayers], ["Theo", "Grace", "Nora", "Jamal"], { kwargs: { n: 10 } }),
              hiddenCase("a tie on the chosen column", [[{ name: "Zed", points: 9, wins: 1 }, { name: "Amy", points: 9, wins: 0 }]], ["Amy"], { kwargs: { n: 1 } }),
              raisesCase([leaguePlayers, "wins"], "TypeError", { label: "the column passed by position" }),
            ], { label: "top_players() ranks by the named column" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def shipping(weight, *, express=False, fee=4):
    return fee * 2 if express else fee + weight // 10

print(shipping(25), shipping(25, express=True), shipping(5, fee=3))
`,
        choices: ["6 8 3", "6 6 3", "8 8 3", "6 8 4"],
        answer: 0,
        why: "Standard: 4 + 25 // 10 = 6. Express: 4 * 2 = 8. A 5 kg parcel with fee 3: 3 + 0 = 3.",
      },
      {
        id: "q2",
        prompt: "A common mistake: calling a keyword-only parameter by position. What happens?",
        program: src`
def convert(amount, *, rate):
    return amount * rate

print("start")
print(convert(50, 2))
`,
        choices: ["start", "start\n100", "100", "(nothing)"],
        answer: 0,
        why: "`start` prints, then the call stops with TypeError (`convert() takes 1 positional argument but 2 were given`) before anything else is printed.",
      },
      {
        id: "q3",
        prompt: "In `def export(rows, *, header=True)`, what does the bare `*` do?",
        choices: ["It makes every parameter after it keyword-only", "It collects extra positional arguments into a tuple", "It multiplies rows by header", "It makes rows optional"],
        answer: 0,
        why: "A bare `*` collects nothing; it only marks where keyword-only parameters begin. `*rows` would collect arguments.",
      },
    ],
    review: [
      "Parameters after a bare `*` must be passed by name; a positional call raises TypeError.",
      "Use keyword-only parameters for flags and for settings that could be mixed up.",
      "Keyword-only parameters can have defaults, and named arguments can come in any order.",
      "Next: `lambda`, a short function written right where it is passed.",
    ],
  },

  // ------------------------------------------------------------------ PY-L15-03 lambda
  {
    id: "PY-L15-03",
    version: 2,
    slug: "a-small-function",
    title: "Inline functions with lambda",
    lede: "`lambda` writes a small function as one expression, right where it is passed, such as a sort key. A function that deserves a name is written with `def`.",
    focus: "Pass a one-expression function inline with lambda, as a key or as an argument, and keep def for anything named or longer.",
    minutes: 15,
    objectives: [
      "Write `key=lambda item: item[\"field\"]` for `sorted`, `min` and `max`",
      "Pass a lambda to your own function that takes a function",
      "Know the limits: one expression, no statements, and never `name = lambda …`",
    ],
    requires: ["function-def", "function-param", "function-return", "assignment", "list-literal", "list-index", "list-comp", "list-mutate", "tuple-literal", "dict-literal", "dict-lookup", "string-index", "string-method", "string-split", "sort-key", "list-sort", "aggregate-call", "arithmetic", "precedence", "comparison", "none-value", "identity", "conditional-expr", "if-statement", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "syntax-error", "boolean", "print-text", "reassignment", "logical"],
    teaches: ["lambda"],
    blocks: [
      {
        kind: "text",
        md: "In the Built-ins & Sorting module every sort key was a `def` written somewhere above the call and used once. `lambda` writes the same function **inline**: `lambda r: r[\"date\"]` takes one parameter, `r`, and returns the expression after the colon. There is no `return`; the expression is the result.",
      },
      {
        kind: "example",
        title: "Keys written where they are used",
        code: src`
readings = [
    {"station": "Boston Logan", "date": "2025-01-14", "tmax": 3.9},
    {"station": "Atlanta Hartsfield", "date": "2025-01-12", "tmax": 11.7},
    {"station": "Great Falls Airport", "date": "2025-01-14", "tmax": -12.2},
]
by_date = sorted(readings, key=lambda r: r["date"])
print([r["station"] for r in by_date])
coldest = min(readings, key=lambda r: r["tmax"])
print(coldest["station"], coldest["tmax"])
`,
        output: "['Atlanta Hartsfield', 'Boston Logan', 'Great Falls Airport']\nGreat Falls Airport -12.2\n",
        note: "`lambda r: r[\"date\"]` is the whole key function: one parameter, one expression. Boston and Great Falls share a date and keep their input order (the sort is stable). Each key is used once, right where it is written, so it doesn't need a name.",
      },
      {
        kind: "text",
        md: "A lambda is a full function value, so it can go to **your** functions too. A function that takes a `key` function can group, count or filter by any rule the caller chooses.",
      },
      {
        kind: "example",
        title: "Group flights by any rule",
        code: src`
def group_by(flights, key):
    groups = {}
    for flight in flights:
        k = key(flight)
        if k not in groups:
            groups[k] = []
        groups[k].append(flight["flight"])
    return groups

flights = [
    {"flight": "UA2017", "origin": "LAS", "arrival_delay": -4},
    {"flight": "MQ3615", "origin": "FAR", "arrival_delay": 42},
    {"flight": "UA1552", "origin": "LAS", "arrival_delay": 16},
]
print(group_by(flights, lambda f: f["origin"]))
print(group_by(flights, lambda f: f["arrival_delay"] >= 15))
`,
        output: "{'LAS': ['UA2017', 'UA1552'], 'FAR': ['MQ3615']}\n{False: ['UA2017'], True: ['MQ3615', 'UA1552']}\n",
        note: "`group_by` doesn't know or care what the rule is; it calls `key(flight)` and groups by the result.",
      },
      {
        kind: "text",
        md: "A lambda holds **one expression**. Statements such as `return`, `if` blocks or assignments are not allowed inside it.",
      },
      {
        kind: "error-example",
        title: "A statement inside a lambda",
        code: src`
invoices = [{"id": "INV-1", "due": "2025-01-31"}]
print(sorted(invoices, key=lambda inv: return inv["due"]))
`,
        error: "SyntaxError",
        output: "",
        note: "The body of a lambda is already the returned value, so `return` has no place there.",
      },
      {
        kind: "text",
        md: "**When to use it:** a short key or rule used once, right in the call. **When not to:** if the function needs a name, several steps, or will be reused, write a `def`. In particular, never write `price_of = lambda p: p[\"price\"]`: that is a `def` with a worse name (`<lambda>` in error messages) and no room for a docstring. Python's style guide (PEP 8) says the same. Prefer a comprehension over `map(lambda …)` and `filter(lambda …)`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Restock the emptiest shelves first",
      prompt: "`restock_order` lists products alphabetically. The warehouse wants the products with the **fewest units in stock** first: change the lambda so it returns the product's `stock`.",
      spec: [
        ["Function", "`restock_order(products)`"],
        ["Returns", "the product names, lowest stock first; equal stock keeps the input order"],
      ],
      starter: src`
def restock_order(products):
    ordered = sorted(products, key=lambda p: p["name"])
    return [p["name"] for p in ordered]

shelf = [
    {"name": "Travel Yoga Mat", "stock": 12},
    {"name": "Deluxe Vase", "stock": 3},
    {"name": "Organic Speaker", "stock": 0},
]
print(restock_order(shelf))
`,
      answer: src`
def restock_order(products):
    ordered = sorted(products, key=lambda p: p["stock"])
    return [p["name"] for p in ordered]

shelf = [
    {"name": "Travel Yoga Mat", "stock": 12},
    {"name": "Deluxe Vase", "stock": 3},
    {"name": "Organic Speaker", "stock": 0},
]
print(restock_order(shelf))
`,
      wrong: [
        {
          code: src`
def restock_order(products):
    ordered = sorted(products, key=lambda p: p["stock"], reverse=True)
    return [p["name"] for p in ordered]
`,
          fails: ["returns"],
          why: "`reverse=True` puts the fullest shelves first",
        },
      ],
      hints: ["Only the expression after the colon changes.", "It should read the stock of the product it is given.", "Smallest first is what `sorted` does without `reverse`."],
      task: {
        checks: [
          fn("returns", "restock_order", [
            example([[{ name: "Travel Yoga Mat", stock: 12 }, { name: "Deluxe Vase", stock: 3 }, { name: "Organic Speaker", stock: 0 }]], ["Organic Speaker", "Deluxe Vase", "Travel Yoga Mat"]),
            hiddenCase("two products with the same stock", [[{ name: "Zip Bag", stock: 5 }, { name: "Atlas", stock: 9 }, { name: "Mug Rack", stock: 5 }]], ["Zip Bag", "Mug Rack", "Atlas"]),
            hiddenCase("no products", [[]], []),
          ], { label: "restock_order() lists the lowest stock first" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Files by type, then name",
        prompt: "A download page lists files grouped by type: all `.csv` files together, then `.jpg`, and so on, types in alphabetical order, and within a type by file name. Capital letters shouldn't matter for either. Write `order_files(names)` using an inline key.",
        spec: [
          ["Function", "`order_files(names)`"],
          ["names", "file names that each contain at least one dot; the type is the part after the **last** dot"],
          ["Returns", "a new list of the names, by type A–Z, then by name A–Z, ignoring capitals for both"],
          ["Example", "`order_files([\"photo.JPG\", \"orders.csv\", \"budget.csv\", \"notes.txt\"])` → `['budget.csv', 'orders.csv', 'photo.JPG', 'notes.txt']`"],
        ],
        starter: src`
def order_files(names):
    return sorted(names)

print(order_files(["photo.JPG", "orders.csv", "budget.csv", "notes.txt"]))
`,
        answer: src`
def order_files(names):
    return sorted(names, key=lambda name: (name.split(".")[-1].lower(), name.lower()))

print(order_files(["photo.JPG", "orders.csv", "budget.csv", "notes.txt"]))
`,
        alternatives: [
          src`
def file_order(name):
    pieces = name.lower().split(".")
    return (pieces[-1], name.lower())

def order_files(names):
    return sorted(names, key=file_order)
`,
        ],
        wrong: [
          {
            code: src`
def order_files(names):
    return sorted(names, key=lambda name: name.split(".")[-1].lower())
`,
            fails: ["returns"],
            why: "only the type is compared, so names of the same type stay in input order",
          },
          {
            code: src`
def order_files(names):
    return sorted(names, key=lambda name: (name.split(".")[1].lower(), name.lower()))
`,
            fails: ["returns"],
            why: "the part after the **first** dot is used, so `photo.raw.csv` is filed under `raw`",
          },
          {
            code: src`
def order_files(names):
    return sorted(names, key=lambda name: (name.split(".")[-1], name))
`,
            fails: ["returns"],
            why: "capitals are not ignored, so `JPG` sorts before `csv`",
          },
        ],
        hints: [
          "The key returns a tuple: the type first, then the name.",
          "`split(\".\")` and the last piece (`[-1]`) give the part after the last dot.",
          "Lower-case both parts of the key; the names you return keep their original spelling.",
        ],
        task: {
          checks: [
            fn("returns", "order_files", [
              example([["photo.JPG", "orders.csv", "budget.csv", "notes.txt"]], ["budget.csv", "orders.csv", "photo.JPG", "notes.txt"]),
              example([["b.txt", "a.txt"]], ["a.txt", "b.txt"]),
              example([[]], []),
              hiddenCase("a name with two dots", [["photo.raw.csv", "agenda.md"]], ["photo.raw.csv", "agenda.md"]),
              hiddenCase("names that differ only in capitals", [["Report.pdf", "annual.PDF"]], ["annual.PDF", "Report.pdf"]),
              hiddenCase("types given in reverse order", [["x.zip", "y.png", "z.csv"]], ["z.csv", "y.png", "x.zip"]),
            ], { label: "order_files() groups by type, then name" }),
          ],
        },
      },
      {
        id: "c2",
        title: "The nearest weather station",
        prompt: "A weather app shows readings from the station nearest the user. Write `nearest_station(stations, lat, lon)`: return the name of the station closest to the point (`lat`, `lon`), or `None` if there are no stations. For short distances, comparing `(lat difference)² + (lon difference)²` is enough to find the closest; if two stations are equally close, return the earlier one.",
        spec: [
          ["Function", "`nearest_station(stations, lat, lon)`"],
          ["stations", "dictionaries with `name`, `lat` and `lon`"],
          ["Returns", "the `name` of the closest station, or `None`"],
          ["Example", "the starter's stations from (42.0, -72.0) → `'Boston Logan'`"],
        ],
        starter: src`
def nearest_station(stations, lat, lon):
    return None

stations = [
    {"name": "Great Falls Airport", "lat": 47.47, "lon": -111.38},
    {"name": "Boston Logan", "lat": 42.36, "lon": -71.01},
    {"name": "Atlanta Hartsfield", "lat": 33.64, "lon": -84.43},
]
print(nearest_station(stations, 42.0, -72.0))
`,
        answer: src`
def nearest_station(stations, lat, lon):
    closest = min(stations, key=lambda s: (s["lat"] - lat) ** 2 + (s["lon"] - lon) ** 2, default=None)
    if closest is None:
        return None
    return closest["name"]

stations = [
    {"name": "Great Falls Airport", "lat": 47.47, "lon": -111.38},
    {"name": "Boston Logan", "lat": 42.36, "lon": -71.01},
    {"name": "Atlanta Hartsfield", "lat": 33.64, "lon": -84.43},
]
print(nearest_station(stations, 42.0, -72.0))
`,
        alternatives: [
          src`
def nearest_station(stations, lat, lon):
    best = None
    best_distance = None
    for s in stations:
        d = (s["lat"] - lat) ** 2 + (s["lon"] - lon) ** 2
        if best_distance is None or d < best_distance:
            best = s["name"]
            best_distance = d
    return best
`,
        ],
        wrong: [
          {
            code: src`
def nearest_station(stations, lat, lon):
    closest = min(stations, key=lambda s: abs(s["lat"] - lat), default=None)
    return None if closest is None else closest["name"]
`,
            fails: ["returns"],
            why: "only latitude is compared, so a station far to the east or west can win",
          },
          {
            code: src`
def nearest_station(stations, lat, lon):
    closest = max(stations, key=lambda s: (s["lat"] - lat) ** 2 + (s["lon"] - lon) ** 2, default=None)
    return None if closest is None else closest["name"]
`,
            fails: ["returns"],
            why: "`max` finds the farthest station",
          },
          {
            code: src`
def nearest_station(stations, lat, lon):
    return min(stations, key=lambda s: (s["lat"] - lat) ** 2 + (s["lon"] - lon) ** 2)["name"]
`,
            fails: ["returns"],
            why: "with no stations, `min` raises ValueError instead of returning None",
          },
        ],
        hints: [
          "This is `min` with a key: the key is the squared distance from the station to the point.",
          "The lambda's parameter is one station; `lat` and `lon` come from the surrounding function.",
          "`default=None` handles no stations; read the name only when a station was found.",
        ],
        task: {
          checks: [
            fn("returns", "nearest_station", [
              example([stations, 42.0, -72.0], "Boston Logan"),
              example([stations, 34.0, -84.0], "Atlanta Hartsfield"),
              example([[], 40.0, -100.0], null),
              hiddenCase("a station east of the point at the same latitude", [[{ name: "Far East", lat: 40, lon: -70 }, { name: "Near South", lat: 38, lon: -99 }], 40, -100], "Near South"),
              hiddenCase("two stations equally close", [[{ name: "West", lat: 10, lon: -1 }, { name: "East", lat: 10, lon: 1 }], 10, 0], "West"),
              hiddenCase("the point is exactly on a station", [[{ name: "A", lat: 1, lon: 1 }, { name: "B", lat: 5, lon: 5 }], 5, 5], "B"),
            ], { label: "nearest_station() finds the closest station" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
routes = [("Express", 95, 42), ("Saver", 140, 18), ("Direct", 95, 36)]
print(min(routes, key=lambda r: (r[1], r[2])))
print(sorted(routes, key=lambda r: -r[2])[0])
`,
        choices: ["('Direct', 95, 36)\n('Express', 95, 42)", "('Express', 95, 42)\n('Express', 95, 42)", "('Direct', 95, 36)\n('Saver', 140, 18)", "('Saver', 140, 18)\n('Express', 95, 42)"],
        answer: 0,
        why: "The first key compares minutes, then price, so Direct beats Express on price. The second sorts by negated price, so the most expensive route comes first.",
      },
      {
        id: "q2",
        prompt: "A common mistake: calling the key yourself. What does this print?",
        program: src`
prices = [31.0, 7.5, 171.25]
print(sorted(prices, key=lambda p: -p))
print((lambda p: -p)(7.5))
`,
        choices: ["[171.25, 31.0, 7.5]\n-7.5", "[7.5, 31.0, 171.25]\n-7.5", "[171.25, 31.0, 7.5]\n7.5", "TypeError"],
        answer: 0,
        why: "`sorted` calls the lambda once per price and sorts by the negated values. Calling it yourself, as in the second line, just gives one result; that is what `key=` would receive if you called the function instead of passing it.",
      },
      {
        id: "q3",
        prompt: "Which is the right use of lambda?",
        choices: ["sorted(rows, key=lambda r: r[\"date\"])", "price_of = lambda p: p[\"price\"]", "A lambda containing an if block and a return", "map(lambda p: p * 1.2, prices) instead of a comprehension"],
        answer: 0,
        why: "A short key passed inline is what lambda is for. Assigning a lambda to a name should be a `def`; statements aren't allowed; and a comprehension reads better than `map` with a lambda.",
      },
    ],
    review: [
      "`lambda x: expression` is a one-expression function, written inline where it is passed.",
      "Use it for short keys and rules (`sorted`, `min`, `max`, your own `key` parameters).",
      "Never assign a lambda to a name: write a `def`. Statements are not allowed in a lambda.",
      "Next: functions that build and return other functions, which remember values.",
    ],
  },

  // ------------------------------------------------------------------ PY-L15-04 closures
  {
    id: "PY-L15-04",
    version: 2,
    slug: "a-function-that-remembers",
    title: "Functions that remember: closures",
    lede: "A function defined inside another function remembers the outer function's variables, even after the outer function has returned. That lets you configure a function once, or give it private state.",
    focus: "Build functions that remember settings or state from the function that created them, using nonlocal to update that state.",
    minutes: 17,
    objectives: [
      "Write a factory: an outer function that defines and returns an inner function",
      "Explain why each returned function keeps its own copy of the outer variables",
      "Update remembered state with `nonlocal`, and recognise the UnboundLocalError when it is missing",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "function-scope", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "dict-literal", "dict-lookup", "string-index", "string-format", "aggregate-call", "len-call", "arithmetic", "precedence", "comparison", "if-statement", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "boolean", "conditional-expr", "else-clause", "print-text"],
    teaches: ["closure"],
    blocks: [
      {
        kind: "text",
        md: "Functions are values: you have passed them as keys. A function can also **return** a function. An inner `def` can use the outer function's parameters, and Python keeps those variables alive for as long as the inner function exists. That combination of a function and the variables it remembers is a **closure**.\n\nThe use: configure once, call many times. A shop has a member discount and a clearance discount. Instead of passing the rate to every call, build one function per discount.",
      },
      {
        kind: "example",
        title: "One function per discount",
        code: src`
def make_discount(rate):
    def apply(price):
        return price * (1 - rate)
    return apply

member = make_discount(0.10)
clearance = make_discount(0.50)
print(member(40), clearance(40))
print(member(25.0))
`,
        output: "36.0 20.0\n22.5\n",
        note: "`make_discount` has finished by the time `member(40)` runs, yet `apply` still knows its `rate`. Each call to the factory creates a new `apply` with its own `rate`.",
      },
      {
        kind: "text",
        md: "A closure can also keep **state** that changes between calls, such as a counter. Reading an outer variable works directly, but assigning to it (`count += 1`) would make Python treat `count` as a new local variable of the inner function. `nonlocal count` says: this name is the outer function's variable; update that one.",
      },
      {
        kind: "example",
        title: "Invoice numbers that never repeat",
        code: src`
def make_numberer(prefix):
    count = 0
    def next_number():
        nonlocal count
        count += 1
        return f"{prefix}-{count:04d}"
    return next_number

invoice_no = make_numberer("INV")
refund_no = make_numberer("RF")
print(invoice_no(), invoice_no(), refund_no(), invoice_no())
`,
        output: "INV-0001 INV-0002 RF-0001 INV-0003\n",
        note: "`:04d` pads the number to four digits. Each numberer has its own `count`: refunds start at 1 even after two invoices.",
      },
      {
        kind: "error-example",
        title: "Forgetting nonlocal",
        code: src`
def make_counter():
    count = 0
    def increment():
        count += 1
        return count
    return increment

clicks = make_counter()
print(clicks())
`,
        error: "UnboundLocalError",
        output: "",
        note: "`count += 1` assigns, so `count` is treated as a local of `increment`, and it has no value yet: `cannot access local variable 'count' where it is not associated with a value`.",
      },
      {
        kind: "text",
        md: "**When to use it:** a configured helper (a discount, a formatter, a validator with its limits) or a small private state (an ID generator, a rate limiter) without needing a class. **Mistakes to avoid:** forgetting `nonlocal` when updating; returning `apply()` (the result of calling it) instead of `apply` (the function); and expecting two closures from the same factory to share state: each call to the factory makes fresh variables.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A tax function instead",
      prompt: "`make_tax` was copied from `make_discount` and still subtracts. Change the inner function so it **adds** the tax: a price of 50 with a rate of 0.2 becomes 60.",
      spec: [
        ["Function", "`make_tax(rate)`"],
        ["Returns", "a function that takes a price and returns `price * (1 + rate)`"],
      ],
      starter: src`
def make_tax(rate):
    def apply(price):
        return price * (1 - rate)
    return apply

vat = make_tax(0.2)
print(vat(50))
`,
      answer: src`
def make_tax(rate):
    def apply(price):
        return price * (1 + rate)
    return apply

vat = make_tax(0.2)
print(vat(50))
`,
      wrong: [
        {
          code: src`
def make_tax(rate):
    def apply(price):
        return price + rate
    return apply
`,
          fails: ["vat", "other-rate"],
          why: "it adds the rate itself (0.2) instead of 20 percent",
        },
      ],
      hints: ["Only one character in the inner function needs to change.", "Adding 20% leaves 120% of the price.", "Multiply by one plus the rate."],
      task: {
        checks: [
          call("vat", "make_tax(0.2) adds 20% to 50", "result = make_tax(0.2)(50)", py.float(60), { show: "make_tax(0.2)(50)" }),
          call("other-rate", "make_tax works for another rate", "result = make_tax(0.05)(200)", py.float(210), { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A request limiter",
        prompt: "A free API plan allows a fixed number of requests. Write `make_limiter(limit)`: it returns a function `allow()` that returns True for the first `limit` calls and False for every call after that. Each limiter counts on its own.",
        spec: [
          ["Function", "`make_limiter(limit)`"],
          ["Returns", "a function `allow()` with no parameters"],
          ["allow()", "True while fewer than `limit` calls have been allowed, then False forever"],
          ["Example", "`allow = make_limiter(2)`, then `allow(), allow(), allow()` → `True True False`"],
        ],
        starter: src`
def make_limiter(limit):
    def allow():
        return True
    return allow

allow = make_limiter(2)
print(allow(), allow(), allow())
`,
        answer: src`
def make_limiter(limit):
    used = 0
    def allow():
        nonlocal used
        if used < limit:
            used += 1
            return True
        return False
    return allow

allow = make_limiter(2)
print(allow(), allow(), allow())
`,
        alternatives: [
          src`
def make_limiter(limit):
    calls = []
    def allow():
        calls.append(1)
        return len(calls) <= limit
    return allow
`,
        ],
        wrong: [
          {
            code: src`
def make_limiter(limit):
    used = 0
    def allow():
        nonlocal used
        used += 1
        return used < limit
    return allow
`,
            fails: ["three-calls", "independent", "five-calls"],
            why: "`<` after counting the call allows one request too few",
          },
          {
            code: src`
used = 0

def make_limiter(limit):
    def allow():
        global used
        used += 1
        return used <= limit
    return allow
`,
            fails: ["independent", "five-calls"],
            why: "one shared counter for every limiter, so two users eat into the same allowance",
          },
        ],
        hints: [
          "The limiter needs a count that survives between calls: a variable in `make_limiter`, used by `allow`.",
          "Updating that count from `allow` needs `nonlocal`.",
          "Allow the call (and count it) only while the count is below the limit.",
        ],
        task: {
          checks: [
            call("three-calls", "make_limiter(2) allows two calls, then refuses", "_a = make_limiter(2)\nresult = [_a(), _a(), _a()]", [true, true, false], { show: "allow = make_limiter(2); [allow(), allow(), allow()]" }),
            call("zero", "make_limiter(0) refuses every call", "_a = make_limiter(0)\nresult = [_a(), _a()]", [false, false], { hidden: true }),
            call("independent", "two limiters count separately", "_a = make_limiter(1)\n_b = make_limiter(1)\nresult = [_a(), _b(), _a(), _b()]", [true, true, false, false], { hidden: true }),
            call("five-calls", "a limit of 3 over five calls", "_a = make_limiter(3)\nresult = [_a() for _ in range(5)]", [true, true, true, false, false], { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "A running average",
        prompt: "A dashboard shows the average response time so far, updated as each new measurement arrives. Write `make_averager()`: it returns a function `add(value)` that records the value and returns the average of **every** value added so far to that averager.",
        spec: [
          ["Function", "`make_averager()`"],
          ["Returns", "a function `add(value)`"],
          ["add(value)", "returns the average of all values added so far, as a number"],
          ["Example", "`add = make_averager()`, then `add(120), add(80), add(130)` → `120.0 100.0 110.0`"],
        ],
        starter: src`
def make_averager():
    def add(value):
        return value
    return add

add = make_averager()
print(add(120), add(80), add(130))
`,
        answer: src`
def make_averager():
    total = 0
    count = 0
    def add(value):
        nonlocal total, count
        total += value
        count += 1
        return total / count
    return add

add = make_averager()
print(add(120), add(80), add(130))
`,
        alternatives: [
          src`
def make_averager():
    values = []
    def add(value):
        values.append(value)
        return sum(values) / len(values)
    return add
`,
        ],
        wrong: [
          {
            code: src`
def make_averager():
    def add(value):
        values = []
        values.append(value)
        return sum(values) / len(values)
    return add
`,
            fails: ["three", "separate"],
            why: "the list is created inside `add`, so every call forgets the earlier values",
          },
          {
            code: src`
def make_averager():
    average = 0
    def add(value):
        nonlocal average
        average = (average + value) / 2
        return average
    return add
`,
            fails: ["three", "one", "separate"],
            why: "averaging with the previous average gives recent values too much weight",
          },
        ],
        hints: [
          "The averager must remember something between calls: either every value, or a running total and a count.",
          "Keep that memory in `make_averager`; update it from `add` (numbers need `nonlocal`, a list can just be appended to).",
          "Return the total divided by how many values there are.",
        ],
        task: {
          checks: [
            call("three", "make_averager() averages every value so far", "_add = make_averager()\nresult = [_add(120), _add(80), _add(130)]", [py.float(120), py.float(100), py.float(110)], { show: "add = make_averager(); [add(120), add(80), add(130)]" }),
            call("one", "a single value is its own average", "result = make_averager()(42)", py.float(42), { hidden: true }),
            call("separate", "two averagers keep separate values", "_a = make_averager()\n_b = make_averager()\n_a(10)\n_b(1000)\nresult = [_a(20), _b(0)]", [py.float(15), py.float(500)], { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def make_greeting(word):
    def greet(name):
        return f"{word}, {name}!"
    return greet

hello = make_greeting("Hello")
welcome = make_greeting("Welcome back")
print(hello("Nora"))
print(welcome("Theo"))
`,
        choices: ["Hello, Nora!\nWelcome back, Theo!", "Hello, Nora!\nHello, Theo!", "Welcome back, Nora!\nWelcome back, Theo!", "greet\ngreet"],
        answer: 0,
        why: "Each call to `make_greeting` creates a new `greet` that remembers its own `word`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a fresh counter per call. What does this print?",
        program: src`
def make_counter():
    count = 0
    def increment():
        nonlocal count
        count += 1
        return count
    return increment

print(make_counter()(), make_counter()(), make_counter()())
`,
        choices: ["1 1 1", "1 2 3", "0 0 0", "3 3 3"],
        answer: 0,
        why: "Each `make_counter()` creates a brand-new counter starting at 0. To count up, call the **same** returned function several times.",
      },
      {
        id: "q3",
        prompt: "When is a closure a good fit?",
        choices: ["A validator configured once with its limits, then called on many values", "Adding two numbers once", "Sorting a list a single time", "Reading a file"],
        answer: 0,
        why: "A closure shines when settings or state should be fixed once and reused across many calls.",
      },
    ],
    review: [
      "An inner function can use the outer function's variables; returned, it keeps them: a closure.",
      "Each call to the factory creates fresh variables, so each returned function has its own.",
      "Assigning to a remembered variable needs `nonlocal`, or Python raises UnboundLocalError.",
      "Next: a function that calls itself, to walk data nested to any depth.",
    ],
  },

  // ------------------------------------------------------------------ PY-L15-05 recursion
  {
    id: "PY-L15-05",
    version: 2,
    slug: "a-function-that-calls-itself",
    title: "Recursion over nested data",
    lede: "Categories contain categories; folders contain folders. A function that calls itself on each child handles any depth, as long as it has a base case that stops.",
    focus: "Write recursive functions over nested data, with a base case, and know the recursion limit and when a loop is better.",
    minutes: 19,
    objectives: [
      "Solve a nested problem by handling one level and calling the same function on each child",
      "Identify the base case, the data with no children where the recursion stops",
      "Know that Python stops very deep recursion with RecursionError, and prefer a loop for long flat chains",
    ],
    requires: ["function-def", "function-param", "function-return", "function-default", "assignment", "reassignment", "list-literal", "list-index", "list-mutate", "list-comp", "dict-literal", "dict-lookup", "dict-iterate", "nested-dict", "string-index", "string-format", "aggregate-call", "len-call", "arithmetic", "precedence", "comparison", "if-statement", "for-loop", "membership", "print-call", "print-several", "unquoted-name", "top-level-indent", "runtime-error", "truthiness", "print-text", "spaces-in-text", "conditional-expr", "nested-loop"],
    teaches: ["recursion"],
    blocks: [
      {
        kind: "text",
        md: "A shop's categories nest: *Electronics* contains *Audio*, which could contain *Headphones*, and nobody knows in advance how deep it goes. A loop handles one level; a loop inside a loop handles two. To handle **any** depth, write a function that handles one category and calls **itself** for each subcategory.\n\nTwo parts make it work. The **recursive step** solves the problem for one level by combining that level with the answers for its children. The **base case** is a category with no children: the loop over children doesn't run, so the function returns without calling itself again.",
      },
      {
        kind: "example",
        title: "Count the products in a category tree",
        code: src`
def count_products(category):
    total = len(category["products"])
    for child in category["children"]:
        total += count_products(child)
    return total

catalog = {
    "name": "All",
    "products": [],
    "children": [
        {"name": "Electronics", "products": ["Organic Speaker"], "children": [
            {"name": "Audio", "products": ["Studio Headphones", "Pocket Radio"], "children": []},
        ]},
        {"name": "Home", "products": ["Deluxe Vase", "Nordic Candle"], "children": []},
    ],
}
print(count_products(catalog))
departments = catalog["children"]
print(count_products(departments[0]))
`,
        output: "5\n3\n",
        note: "Audio has no children, so its call simply returns 2. Electronics adds its own 1 to Audio's 2. The same function answers for the whole catalog or any part of it.",
      },
      {
        kind: "text",
        md: "The answer can be a list as well as a number. Here each call returns the paths of the files in one folder and below it. The path so far is passed down as a parameter, so every level knows where it is. `extend` adds every item of another list to the end of this one.",
      },
      {
        kind: "example",
        title: "Every file path in a folder tree",
        code: src`
def file_paths(folder, prefix):
    here = prefix + folder["name"] + "/"
    paths = [here + name for name in folder["files"]]
    for sub in folder["folders"]:
        paths.extend(file_paths(sub, here))
    return paths

tree = {"name": "docs", "files": ["notes.txt"], "folders": [
    {"name": "2025", "files": ["report.csv", "budget.csv"], "folders": []},
    {"name": "photos", "files": [], "folders": [
        {"name": "trip", "files": ["beach.jpg"], "folders": []},
    ]},
]}
for path in file_paths(tree, ""):
    print(path)
`,
        output: "docs/notes.txt\ndocs/2025/report.csv\ndocs/2025/budget.csv\ndocs/photos/trip/beach.jpg\n",
        note: "`photos` has no files of its own; its call still returns its sub-folder's paths.",
      },
      {
        kind: "text",
        md: "Every call waits for the calls it makes, and Python keeps a frame in memory for each waiting call. To protect the program, it stops at a limit of about 1,000 nested calls with RecursionError. A function with **no** base case, or one whose input never gets smaller, always hits it.",
      },
      {
        kind: "error-example",
        title: "A recursion that never stops",
        code: src`
def depth_of(level):
    return depth_of(level - 1)

print(depth_of(3))
`,
        error: "RecursionError",
        output: "",
        note: "`RecursionError: maximum recursion depth exceeded`. Nothing tells `depth_of` to stop, so it calls itself until Python refuses.",
      },
      {
        kind: "text",
        md: "**When to use it:** trees of unknown depth: categories, folders, comment threads, nested JSON. Real trees are rarely more than a few dozen levels deep, far below the limit. **When a loop is better:** a long, flat chain, such as a linked list of 10,000 events, or simple counting. Recursing once per item there hits the limit, and a `for` or `while` loop does the same job with no depth at all. **Mistakes to avoid:** a missing or unreachable base case; forgetting to `return` (or add up) the result of the recursive call; and building the result in a list defined outside the function, which keeps growing between calls.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Size of a whole folder",
      prompt: "`total_size` only adds up the files directly in a folder. Make it include every sub-folder too, by calling itself on each sub-folder and adding the result.",
      spec: [
        ["Function", "`total_size(folder)`"],
        ["folder", "`{\"files\": {name: size}, \"folders\": [sub-folders…]}`"],
        ["Returns", "the size of every file in the folder and all its sub-folders"],
      ],
      starter: src`
def total_size(folder):
    size = sum(folder["files"].values())
    return size

tree = {"files": {"notes.txt": 120}, "folders": [{"files": {"report.csv": 300, "budget.csv": 80}, "folders": []}]}
print(total_size(tree))
`,
      answer: src`
def total_size(folder):
    size = sum(folder["files"].values())
    for sub in folder["folders"]:
        size += total_size(sub)
    return size

tree = {"files": {"notes.txt": 120}, "folders": [{"files": {"report.csv": 300, "budget.csv": 80}, "folders": []}]}
print(total_size(tree))
`,
      wrong: [
        {
          code: src`
def total_size(folder):
    return 500
`,
          fails: ["returns"],
          why: "the total is typed in instead of added up",
        },
      ],
      hints: ["Keep the line that adds this folder's own files.", "Walk the sub-folders with a `for` loop.", "Add each sub-folder's total, which is exactly what `total_size` itself computes."],
      task: {
        checks: [
          fn("returns", "total_size", [
            example([{ files: { "notes.txt": 120 }, folders: [{ files: { "report.csv": 300, "budget.csv": 80 }, folders: [] }] }], 500),
            hiddenCase("three levels deep", [{ files: {}, folders: [{ files: { a: 1 }, folders: [{ files: { b: 2 }, folders: [{ files: { c: 4 }, folders: [] }] }] }] }], 7),
            hiddenCase("an empty folder", [{ files: {}, folders: [] }], 0),
          ], { label: "total_size() adds files at every depth" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "How deep does it go?",
        prompt: "Before migrating a file share, the IT team wants to know how deeply its folders nest. Write `depth(folder)`: a folder with no sub-folders has depth 1; otherwise its depth is 1 more than its deepest sub-folder.",
        spec: [
          ["Function", "`depth(folder)`"],
          ["folder", "a dictionary with `name`, `files` and `folders` (a list of folders of the same shape)"],
          ["Returns", "a whole number, at least 1"],
          ["Example", "the starter's tree (shop → data → 2024) → `3`"],
        ],
        starter: src`
def depth(folder):
    return 1

tree = {"name": "shop", "files": ["README.md"], "folders": [
    {"name": "data", "files": ["orders.csv"], "folders": [
        {"name": "2024", "files": ["jan.csv"], "folders": []},
        {"name": "2025", "files": [], "folders": []},
    ]},
    {"name": "docs", "files": ["guide.md"], "folders": []},
]}
print(depth(tree))
`,
        answer: src`
def depth(folder):
    deepest_below = max((depth(sub) for sub in folder["folders"]), default=0)
    return 1 + deepest_below

tree = {"name": "shop", "files": ["README.md"], "folders": [
    {"name": "data", "files": ["orders.csv"], "folders": [
        {"name": "2024", "files": ["jan.csv"], "folders": []},
        {"name": "2025", "files": [], "folders": []},
    ]},
    {"name": "docs", "files": ["guide.md"], "folders": []},
]}
print(depth(tree))
`,
        alternatives: [
          src`
def depth(folder):
    deepest = 0
    for sub in folder["folders"]:
        d = depth(sub)
        if d > deepest:
            deepest = d
    return deepest + 1
`,
        ],
        wrong: [
          {
            code: src`
def depth(folder):
    total = 1
    for sub in folder["folders"]:
        total += depth(sub)
    return total
`,
            fails: ["returns"],
            why: "adding the sub-folders' depths counts folders, not levels",
          },
          {
            code: src`
def depth(folder):
    if not folder["folders"]:
        return 1
    return 1 + depth(folder["folders"][0])
`,
            fails: ["returns"],
            why: "only the first sub-folder is followed, so a deeper later one is missed",
          },
        ],
        hints: [
          "Base case: no sub-folders means depth 1.",
          "Otherwise ask each sub-folder for its own depth and keep the largest.",
          "`max` with `default=0` handles the no-sub-folder case in the same line: 1 + 0.",
        ],
        task: {
          checks: [
            fn("returns", "depth", [
              example([projectTree], 3),
              example([leaf("empty")], 1),
              example([{ name: "a", files: [], folders: [leaf("b")] }], 2),
              hiddenCase("the deepest branch is not the first", [{ name: "r", files: [], folders: [leaf("x"), { name: "y", files: [], folders: [{ name: "z", files: [], folders: [leaf("w")] }] }] }], 4),
              hiddenCase("many sub-folders at one level", [{ name: "r", files: [], folders: [leaf("a"), leaf("b"), leaf("c")] }], 2),
              hiddenCase("a long single chain", [{ name: "1", files: [], folders: [{ name: "2", files: [], folders: [{ name: "3", files: [], folders: [{ name: "4", files: [], folders: [leaf("5")] }] }] }] }], 5),
            ], { label: "depth() measures the deepest level" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Breadcrumbs for every category",
        prompt: "A shop's navigation shows breadcrumbs like `All > Electronics > Audio`. Write `breadcrumbs(category)`: return the breadcrumb of **every** category in the tree, the category itself first, then each child's breadcrumbs in order (a parent always comes before its children).",
        spec: [
          ["Function", "`breadcrumbs(category)` (you may add a parameter with a default value)"],
          ["category", "`{\"name\": …, \"children\": [categories…]}`"],
          ["Returns", "a list of texts, names joined with `\" > \"`, top category first"],
          ["Example", "a tree All → [Electronics → [Audio], Home] → `['All', 'All > Electronics', 'All > Electronics > Audio', 'All > Home']`"],
        ],
        starter: src`
def breadcrumbs(category):
    return [category["name"]]

menu = {"name": "All", "children": [
    {"name": "Electronics", "children": [{"name": "Audio", "children": []}]},
    {"name": "Home", "children": []},
]}
for crumb in breadcrumbs(menu):
    print(crumb)
`,
        answer: src`
def breadcrumbs(category, trail=""):
    here = trail + " > " + category["name"] if trail else category["name"]
    crumbs = [here]
    for child in category["children"]:
        crumbs.extend(breadcrumbs(child, here))
    return crumbs

menu = {"name": "All", "children": [
    {"name": "Electronics", "children": [{"name": "Audio", "children": []}]},
    {"name": "Home", "children": []},
]}
for crumb in breadcrumbs(menu):
    print(crumb)
`,
        alternatives: [
          src`
def breadcrumbs(category):
    crumbs = [category["name"]]
    for child in category["children"]:
        for below in breadcrumbs(child):
            crumbs.append(category["name"] + " > " + below)
    return crumbs
`,
        ],
        wrong: [
          {
            code: src`
def breadcrumbs(category, trail=""):
    here = trail + " > " + category["name"] if trail else category["name"]
    crumbs = []
    for child in category["children"]:
        crumbs.extend(breadcrumbs(child, here))
    crumbs.append(here)
    return crumbs
`,
            fails: ["returns"],
            why: "each category is added after its children, so children come before their parent",
          },
          {
            code: src`
def breadcrumbs(category, trail=""):
    here = trail + " > " + category["name"] if trail else category["name"]
    crumbs = [here]
    for child in category["children"]:
        crumbs.append(here + " > " + child["name"])
    return crumbs
`,
            fails: ["returns"],
            why: "only one level of children is listed; grandchildren are missing",
          },
          {
            code: src`
def breadcrumbs(category, trail=""):
    crumbs = [category["name"]]
    for child in category["children"]:
        crumbs.extend(breadcrumbs(child))
    return crumbs
`,
            fails: ["returns"],
            why: "the path is never passed down, so every crumb is a bare name",
          },
        ],
        hints: [
          "Each call needs to know the path above it: pass it down as an extra parameter with a default for the top call.",
          "Build this category's crumb first, then add the crumbs of each child, which the same function returns.",
          "The top category has no path above it, so its crumb is just its name, with no `>`.",
        ],
        task: {
          checks: [
            fn("returns", "breadcrumbs", [
              example([menu], ["All", "All > Electronics", "All > Electronics > Audio", "All > Electronics > Audio > Headphones", "All > Electronics > Cameras", "All > Home"]),
              example([cat("Sale")], ["Sale"]),
              example([cat("A", [cat("B")])], ["A", "A > B"]),
              hiddenCase("several children in order", [cat("Shop", [cat("Toys"), cat("Books"), cat("Garden")])], ["Shop", "Shop > Toys", "Shop > Books", "Shop > Garden"]),
              hiddenCase("a deep single branch", [cat("1", [cat("2", [cat("3", [cat("4")])])])], ["1", "1 > 2", "1 > 2 > 3", "1 > 2 > 3 > 4"]),
              hiddenCase("children with their own children", [cat("R", [cat("X", [cat("X1")]), cat("Y", [cat("Y1"), cat("Y2")])])], ["R", "R > X", "R > X > X1", "R > Y", "R > Y > Y1", "R > Y > Y2"]),
            ], { label: "breadcrumbs() lists every category's path, parents first" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def count_comments(comment):
    return 1 + sum(count_comments(reply) for reply in comment["replies"])

thread = {"replies": [{"replies": []}, {"replies": [{"replies": []}, {"replies": []}]}]}
print(count_comments(thread))
`,
        choices: ["5", "3", "4", "2"],
        answer: 0,
        why: "The top comment counts 1; the first reply counts 1; the second reply counts 1 plus its two replies. 1 + 1 + 3 = 5. A comment with no replies is the base case: `sum` of nothing is 0.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the recursive call's result is thrown away. What does this print?",
        program: src`
def count_products(category):
    total = len(category["products"])
    for child in category["children"]:
        count_products(child)
    return total

shop = {"products": ["Vase"], "children": [{"products": ["Lamp", "Rug"], "children": []}]}
print(count_products(shop))
`,
        choices: ["1", "3", "2", "None"],
        answer: 0,
        why: "The child's total (2) is computed but never added, so only the top category's own product is counted.",
      },
      {
        id: "q3",
        prompt: "Which job is better done with a loop than with recursion?",
        choices: ["Adding up 50,000 payment amounts in a list", "Listing every file in nested folders", "Counting replies in a comment thread", "Finding the deepest category in a menu"],
        answer: 0,
        why: "A flat list has no nesting to follow, and one recursive call per item would exceed Python's recursion limit. The others are trees of unknown depth.",
      },
    ],
    review: [
      "A recursive function handles one level and calls itself on each child; the base case (no children) stops it.",
      "Return and combine the results of the recursive calls; pass information down as parameters.",
      "Python stops at about 1,000 nested calls with RecursionError; use a loop for long flat chains.",
      "Next module: Python's collections and itertools, ready-made tools for counting, grouping and combining.",
    ],
  },
];
