/**
 * M37 practice: ten independent problems on timing, profiling, caching, efficient I/O and algorithmic optimisation
 * (PY-L37-01 … PY-L37-05).
 *
 * Mix: 5 function implementations, 2 debugging (an unhashable cache argument, a stale cache), 1 performance (stream a
 * filter with a memory peak budget) and 2 output predictions over deterministic profiler call counts. Easy: 02, 03, 06.
 * Medium: 10, 12, 13, 16, 19. Hard: 20, 22.
 *
 * No check reads a stopwatch: timing questions work on measured totals the checker supplies, profiles are judged by
 * call counts, caches by calls and hits, I/O by a tracemalloc peak, and optimisations by counted reads.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase, keepsInput } from "../checks";
import { py } from "@/engine/python/values";
import { readBudget } from "../lessons/M35";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const yes = py.bool(true);
const pair = (a: string, b: number) => py.tuple(py.str(a), py.float(b));

export const m37Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q37-02",
    version: 2,
    slug: "profile-call-counts",
    title: "Predict: what the profiler counts",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 6,
    requires: ["arithmetic", "assignment", "comparison", "dict-iterate", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "lambda", "list-comp", "list-index", "list-literal", "list-sort", "membership", "nested-index", "print-call", "print-several", "print-text", "profile-call", "string-index", "string-method", "top-level-indent"],
    prompt: "This SKU lookup is profiled, and the program prints the result and then the call counts of its own functions (sorted by name). Type exactly what it prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Count `clean` calls per SKU: one for the SKU itself, plus one per catalogue entry in the list comprehension.",
      "The comprehension is rebuilt for every SKU, so that work repeats.",
      "Only the first SKU matches after cleaning.",
    ],
    explanation: "For each of the 2 SKUs, `clean(sku)` runs once and the comprehension calls `clean` for all 3 catalogue entries: 2 × 4 = 8 calls. `lookup` runs once. Only `\"spo-11681 \"` matches, so the result is 1. The count of 8 is the clue a profile gives you: the cleaned catalogue should be built once, outside the loop.",
    predict: {
      program: src`
import cProfile
import pstats

def clean(sku):
    return sku.strip().upper()

def lookup(skus, catalogue):
    found = 0
    for sku in skus:
        if clean(sku) in [clean(c) for c in catalogue]:
            found += 1
    return found

profiler = cProfile.Profile()
print(profiler.runcall(lookup, ["spo-11681 ", "xyz"], ["SPO-11681", "hom-22847", "ELE-24781"]))
for (filename, line, name), values in sorted(pstats.Stats(profiler).stats.items(), key=lambda item: item[0][2]):
    if filename != "~":
        print(name, values[1])
`,
      output: "1\nclean 8\nlookup 1\n",
      wrongPredictions: ["1\nclean 5\nlookup 1\n", "1\nclean 2\nlookup 1\n", "2\nclean 8\nlookup 1\n", "1\nclean 6\nlookup 1\n"],
    },
  },
  {
    id: "PY-Q37-03",
    version: 2,
    slug: "unhashable-cache-argument",
    title: "Fix the cached shipping quote",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conditional-expr", "decorator-at", "decorator-call", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "lru-cache", "precedence", "print-call", "print-several", "print-text", "string-index", "top-level-indent"],
    prompt: "A checkout caches shipping quotes because computing one is slow. Since `@cache` was added, every checkout crashes with `TypeError: unhashable type: 'list'`. Fix it so the quote is still cached, and callers can keep passing the cart's weights as a list.",
    spec: [
      ["Function", "`shipping_quote(weights, zone)` (called with a list of weights in kg and a zone name)"],
      ["Returns", "`5.99` plus `1.25` per kg of total weight for `\"domestic\"`, `24.0` plus `3.5` per kg otherwise"],
      ["Rule", "repeated quotes for the same weights and zone are computed once"],
    ],
    hiddenKinds: ["the same cart quoted twice", "weights in a different order", "an empty cart"],
    hints: [
      "The cache stores results in a dictionary keyed by the arguments; what kind of value can be a key?",
      "Keep the public function taking a list, and cache a helper that takes a tuple.",
      "Convert the list with `tuple(weights)` before calling the cached helper.",
    ],
    explanation: "`@cache` keys its dictionary by the arguments, and a list is unhashable. A small cached helper taking `tuple(weights)` keeps the public signature and makes the key hashable. Removing `@cache` avoids the crash but loses the caching; converting to a `set` would merge equal weights and give the wrong total.",
    code: {
      starter: src`
from functools import cache

calls = {"n": 0}

@cache
def shipping_quote(weights, zone):
    calls["n"] += 1
    total = sum(weights)
    if zone == "domestic":
        return 5.99 + 1.25 * total
    return 24.0 + 3.5 * total

print(shipping_quote([2.75, 0.3], "domestic"))
`,
      answer: src`
from functools import cache

calls = {"n": 0}

@cache
def quote_for(weights, zone):
    calls["n"] += 1
    total = sum(weights)
    if zone == "domestic":
        return 5.99 + 1.25 * total
    return 24.0 + 3.5 * total

def shipping_quote(weights, zone):
    return quote_for(tuple(weights), zone)

print(shipping_quote([2.75, 0.3], "domestic"))
`,
      alternatives: [
        src`
from functools import lru_cache

calls = {"n": 0}

@lru_cache(maxsize=1024)
def _cached(weights, zone):
    calls["n"] += 1
    rate = 1.25 if zone == "domestic" else 3.5
    base = 5.99 if zone == "domestic" else 24.0
    return base + rate * sum(weights)

def shipping_quote(weights, zone):
    return _cached(tuple(weights), zone)
`,
      ],
      wrong: [
        {
          code: src`
calls = {"n": 0}

def shipping_quote(weights, zone):
    calls["n"] += 1
    total = sum(weights)
    if zone == "domestic":
        return 5.99 + 1.25 * total
    return 24.0 + 3.5 * total
`,
          fails: ["cached"],
          why: "removing the cache stops the crash, but every quote is computed again",
        },
        {
          code: src`
from functools import cache

calls = {"n": 0}

@cache
def quote_for(weights, zone):
    calls["n"] += 1
    total = sum(weights)
    if zone == "domestic":
        return 5.99 + 1.25 * total
    return 24.0 + 3.5 * total

def shipping_quote(weights, zone):
    return quote_for(frozenset(weights), zone)
`,
          fails: ["returns"],
          why: "a set drops repeated weights, so two parcels of the same weight are charged as one",
        },
      ],
      task: {
        checks: [
          fn("returns", "shipping_quote", [
            example([[2.75, 0.3], "domestic"], 9.8025),
            example([[1.0], "international"], 27.5),
            example([[], "domestic"], 5.99),
            hiddenCase("two parcels of the same weight", [[2.0, 2.0], "domestic"], 10.99),
            hiddenCase("several parcels abroad", [[0.5, 1.5, 3.0], "canada"], 41.5),
          ], { label: "shipping_quote() prices the cart" }),
          {
            kind: "expr",
            id: "cached",
            label: "the same cart and zone are computed once",
            hidden: true,
            expr: "_before = calls['n']\nshipping_quote([9.25, 1.0], 'domestic')\nshipping_quote([9.25, 1.0], 'domestic')\nshipping_quote([9.25, 1.0], 'domestic')\nresult = calls['n'] - _before",
            expected: py.int(1),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q37-06",
    version: 2,
    slug: "benchmark-summary",
    title: "Summarise a benchmark run",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["aggregate-call", "arithmetic", "assignment", "dict-literal", "function-def", "function-param", "function-return", "list-literal", "list-sort", "print-call", "print-several", "string-index", "top-level-indent"],
    prompt: "A CI job stores the totals that `timeit.repeat` returned. Write `summarise(totals, number)` for its report: the best and worst per-call times and how noisy the run was (the worst round divided by the best).",
    spec: [
      ["Function", "`summarise(totals, number)`"],
      ["totals", "a non-empty list of round totals in seconds, each for `number` calls"],
      ["Returns", "`{\"best\": …, \"worst\": …, \"spread\": …}`: best and worst per-call seconds, and worst total ÷ best total"],
    ],
    hiddenKinds: ["a single round", "a very noisy run", "best round in the middle"],
    hints: [
      "Per-call times are round totals divided by `number`.",
      "Best is the smallest round, worst the largest.",
      "The spread is a ratio of totals, so `number` cancels out.",
    ],
    explanation: "The best round is the least disturbed, so `min(totals) / number` estimates the code's own cost; the worst shows how bad interference got; their ratio (1.0 = perfectly steady) tells the reviewer whether to trust small differences. A spread of 3 means the machine was busy and the comparison should be rerun.",
    code: {
      starter: src`
def summarise(totals, number):
    return {}

print(summarise([0.41, 0.40, 0.52], 1000))
`,
      answer: src`
def summarise(totals, number):
    best = min(totals)
    worst = max(totals)
    return {"best": best / number, "worst": worst / number, "spread": worst / best}

print(summarise([0.41, 0.40, 0.52], 1000))
`,
      alternatives: [
        src`
def summarise(totals, number):
    ordered = sorted(totals)
    return {"best": ordered[0] / number, "worst": ordered[-1] / number, "spread": ordered[-1] / ordered[0]}
`,
      ],
      wrong: [
        {
          code: src`
def summarise(totals, number):
    return {"best": min(totals), "worst": max(totals), "spread": max(totals) / min(totals)}
`,
          fails: ["returns"],
          why: "best and worst are round totals, not per-call times",
        },
        {
          code: src`
def summarise(totals, number):
    best = totals[0] / number
    worst = totals[-1] / number
    return {"best": best, "worst": worst, "spread": worst / best}
`,
          fails: ["returns"],
          why: "it assumes the rounds are already sorted",
        },
      ],
      task: {
        checks: [
          fn("returns", "summarise", [
            example([[0.41, 0.4, 0.52], 1000], { best: 0.0004, worst: 0.00052, spread: 1.3 }),
            example([[2.0, 1.0], 10], { best: 0.1, worst: 0.2, spread: py.float(2) }),
            example([[0.5], 5], { best: 0.1, worst: 0.1, spread: py.float(1) }),
            hiddenCase("a very noisy run", [[0.3, 0.9, 0.31], 100], { best: 0.003, worst: 0.009, spread: py.float(3) }),
            hiddenCase("best round in the middle", [[5.0, 4.0, 6.0], 2], { best: py.float(2), worst: py.float(3), spread: 1.5 }),
            hiddenCase("one call per round", [[0.25, 0.75], 1], { best: 0.25, worst: 0.75, spread: py.float(3) }),
          ], { label: "summarise() reports best, worst and spread" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q37-10",
    version: 2,
    slug: "shared-emails",
    title: "Customers sharing an email, without comparing every pair",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["assignment", "bitwise", "comp-if", "comparison", "defaultdict-call", "dict-comp", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "print-call", "set-literal", "string-index", "string-method", "top-level-indent"],
    prompt: "A CRM clean-up finds email addresses used by more than one customer account. Emails are compared after `strip()` and `lower()`. Write `shared_emails(customers)` that works in one pass, so it stays fast on 100,000 accounts: the hidden test counts how often the customer list is read.",
    spec: [
      ["Function", "`shared_emails(customers)`"],
      ["customers", "a list of `{\"customer_id\": ..., \"email\": ...}` dictionaries"],
      ["Returns", "a dictionary from normalised email to the sorted list of customer IDs using it, only for emails used by two or more different IDs"],
      ["Constraint", "read the list about once: at most 2 × len(customers) reads"],
    ],
    hiddenKinds: ["the same customer listed twice", "emails differing only in case and spaces", "no shared emails", "an empty list", "600 customers (read budget)"],
    hints: [
      "Group as you go: a dictionary from normalised email to the IDs seen with it.",
      "A customer ID that appears twice with the same email is still one customer, so don't add it twice.",
      "Afterwards keep the groups with at least two IDs, and sort each one.",
    ],
    explanation: "One pass builds `email → IDs` (normalising with `strip().lower()` and skipping an ID already in that group); then a dictionary comprehension keeps groups of two or more, sorted. The nested-loop version compares every pair of accounts, 5 billion comparisons for 100,000 customers.",
    code: {
      starter: src`
def shared_emails(customers):
    return {}

customers = [
    {"customer_id": "C00038", "email": "nora_garcia@fastmail.com"},
    {"customer_id": "C00077", "email": " Nora_Garcia@Fastmail.com"},
    {"customer_id": "C01338", "email": "grace_walker29@yahoo.com"},
]
print(shared_emails(customers))
`,
      answer: src`
def shared_emails(customers):
    groups = {}
    for customer in customers:
        email = customer["email"].strip().lower()
        if email not in groups:
            groups[email] = []
        if customer["customer_id"] not in groups[email]:
            groups[email].append(customer["customer_id"])
    return {email: sorted(ids) for email, ids in groups.items() if len(ids) > 1}

customers = [
    {"customer_id": "C00038", "email": "nora_garcia@fastmail.com"},
    {"customer_id": "C00077", "email": " Nora_Garcia@Fastmail.com"},
    {"customer_id": "C01338", "email": "grace_walker29@yahoo.com"},
]
print(shared_emails(customers))
`,
      alternatives: [
        src`
from collections import defaultdict

def shared_emails(customers):
    seen = defaultdict(set)
    for c in customers:
        seen[c["email"].strip().lower()] |= {c["customer_id"]}
    result = {}
    for email, ids in seen.items():
        if len(ids) >= 2:
            result[email] = sorted(ids)
    return result
`,
      ],
      wrong: [
        {
          code: src`
def shared_emails(customers):
    result = {}
    for a in customers:
        for b in customers:
            ea = a["email"].strip().lower()
            if ea == b["email"].strip().lower() and a["customer_id"] != b["customer_id"]:
                ids = result.get(ea, [])
                for cid in (a["customer_id"], b["customer_id"]):
                    if cid not in ids:
                        ids.append(cid)
                result[ea] = sorted(ids)
    return result
`,
          fails: ["reads"],
          why: "right groups, but every pair of customers is compared",
        },
        {
          code: src`
def shared_emails(customers):
    groups = {}
    for customer in customers:
        email = customer["email"].strip().lower()
        if email not in groups:
            groups[email] = []
        groups[email].append(customer["customer_id"])
    return {email: sorted(ids) for email, ids in groups.items() if len(ids) > 1}
`,
          fails: ["returns"],
          why: "one customer listed twice with the same email is reported as sharing it with themselves",
        },
      ],
      task: {
        checks: [
          fn("returns", "shared_emails", [
            example([[{ customer_id: "C00038", email: "nora_garcia@fastmail.com" }, { customer_id: "C00077", email: " Nora_Garcia@Fastmail.com" }, { customer_id: "C01338", email: "grace_walker29@yahoo.com" }]], { "nora_garcia@fastmail.com": ["C00038", "C00077"] }),
            example([[{ customer_id: "C1", email: "a@x.com" }, { customer_id: "C2", email: "b@x.com" }]], {}),
            example([[]], {}),
            hiddenCase("the same customer listed twice", [[{ customer_id: "C5", email: "z@x.com" }, { customer_id: "C5", email: "z@x.com" }]], {}),
            hiddenCase("three accounts on one email", [[{ customer_id: "C9", email: "Q@x.com" }, { customer_id: "C3", email: "q@x.com " }, { customer_id: "C4", email: "q@X.com" }]], { "q@x.com": ["C3", "C4", "C9"] }),
          ], { label: "shared_emails() groups customers by normalised email" }),
          { kind: "expr", id: "reads", label: "the customer list is read about once", hidden: true, expr: readBudget("[{'customer_id': f'C{i}', 'email': f'user{i % 400}@example.com'} for i in range(600)]", "shared_emails(_data)", 1200), expected: yes },
        ],
      },
    },
  },
  {
    id: "PY-Q37-12",
    version: 2,
    slug: "profile-recursive-depth",
    title: "Predict: primitive and total calls",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 8,
    requires: ["aggregate-call", "arithmetic", "assignment", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "lambda", "list-index", "list-literal", "list-sort", "membership", "nested-dict", "nested-index", "print-call", "print-several", "profile-call", "string-index", "top-level-indent"],
    prompt: "A recursive function measuring the depth of a category tree is profiled. The program prints the result, then each function's primitive and total call counts. Type exactly what it prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`depth` runs once for every category in the tree; count the dictionaries.",
      "A primitive call is one that didn't come from the function itself.",
      "`report` calls `depth` once from outside; every other `depth` call is recursive.",
    ],
    explanation: "The tree has 4 category dictionaries, so `depth` runs 4 times in total, but only the call from `report` is primitive (`1 4`, shown as `4/1` in a pstats table). `report` runs once (`1 1`). The deepest path has 3 levels, so the result is 3.",
    predict: {
      program: src`
import cProfile
import pstats

def depth(category):
    return 1 + max([depth(child) for child in category["children"]], default=0)

def report(tree):
    return depth(tree)

tree = {"children": [{"children": []}, {"children": [{"children": []}]}]}
profiler = cProfile.Profile()
print(profiler.runcall(report, tree))
stats = pstats.Stats(profiler).stats
for key, values in sorted(stats.items(), key=lambda item: item[0][2]):
    if key[2] in ("depth", "report"):
        print(key[2], values[0], values[1])
`,
      output: "3\ndepth 1 4\nreport 1 1\n",
      wrongPredictions: ["3\ndepth 4 4\nreport 1 1\n", "3\ndepth 1 3\nreport 1 1\n", "4\ndepth 1 4\nreport 1 1\n", "2\ndepth 1 4\nreport 1 1\n"],
    },
  },
  {
    id: "PY-Q37-13",
    version: 2,
    slug: "stale-rate-cache",
    title: "Fix the converter that ignores new rates",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["arithmetic", "assignment", "decorator-at", "decorator-call", "dict-literal", "dict-lookup", "function-def", "function-param", "function-return", "import-module", "list-mutate", "lru-cache", "print-call", "print-several", "print-text", "string-index", "top-level-indent"],
    prompt: "Prices are converted with cached exchange rates. When finance updates a rate with `set_rate`, conversions keep using the old rate until the server restarts. Fix it so a conversion after `set_rate` uses the new rate, while repeated conversions between updates are still cached.",
    spec: [
      ["Functions", "`set_rate(currency, rate)` updates the rate table; `convert(amount, currency)` returns `amount * rate`"],
      ["Rule", "after `set_rate`, conversions use the new rate; between updates, repeated conversions of the same amount are cached"],
    ],
    hiddenKinds: ["a rate changed twice", "a conversion repeated between updates", "a new currency added"],
    hints: [
      "The cached `convert` never looks at `RATES` again for arguments it has seen.",
      "Its result depends on something other than its arguments, so the cache must be emptied when that thing changes.",
      "`lru_cache` functions have a method that empties their cache; call it from `set_rate`.",
    ],
    explanation: "`convert` depends on the global `RATES` as well as its arguments, so its cached results go stale when a rate changes. Calling `convert.cache_clear()` in `set_rate` throws away every stale result; conversions between updates are still served from the cache. Removing the cache fixes the staleness but loses the caching.",
    code: {
      starter: src`
from functools import lru_cache

RATES = {"EUR": 0.92, "GBP": 0.79}
computed = {"n": 0}

def set_rate(currency, rate):
    RATES[currency] = rate

@lru_cache(maxsize=256)
def convert(amount, currency):
    computed["n"] += 1
    return amount * RATES[currency]

print(convert(100, "EUR"))
set_rate("EUR", 0.95)
print(convert(100, "EUR"))
`,
      answer: src`
from functools import lru_cache

RATES = {"EUR": 0.92, "GBP": 0.79}
computed = {"n": 0}

def set_rate(currency, rate):
    RATES[currency] = rate
    convert.cache_clear()

@lru_cache(maxsize=256)
def convert(amount, currency):
    computed["n"] += 1
    return amount * RATES[currency]

print(convert(100, "EUR"))
set_rate("EUR", 0.95)
print(convert(100, "EUR"))
`,
      alternatives: [
        src`
from functools import lru_cache

RATES = {"EUR": 0.92, "GBP": 0.79}
computed = {"n": 0}

@lru_cache(maxsize=256)
def _convert(amount, currency, rate):
    computed["n"] += 1
    return amount * rate

def convert(amount, currency):
    return _convert(amount, currency, RATES[currency])

def set_rate(currency, rate):
    RATES[currency] = rate
`,
      ],
      wrong: [
        {
          code: src`
RATES = {"EUR": 0.92, "GBP": 0.79}
computed = {"n": 0}

def set_rate(currency, rate):
    RATES[currency] = rate

def convert(amount, currency):
    computed["n"] += 1
    return amount * RATES[currency]
`,
          fails: ["cached"],
          why: "without the cache every conversion is recomputed",
        },
        {
          code: src`
from functools import lru_cache

RATES = {"EUR": 0.92, "GBP": 0.79}
computed = {"n": 0}

def set_rate(currency, rate):
    convert.cache_clear()
    RATES[currency] == rate

@lru_cache(maxsize=256)
def convert(amount, currency):
    computed["n"] += 1
    return amount * RATES[currency]
`,
          fails: ["updated", "twice", "new-currency"],
          why: "`==` compares instead of assigning, so the rate never changes",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "updated",
            label: "a conversion after set_rate uses the new rate",
            show: "convert(100, 'EUR'); set_rate('EUR', 0.95); convert(100, 'EUR')",
            expr: "set_rate('EUR', 0.92)\n_a = convert(100, 'EUR')\nset_rate('EUR', 0.95)\n_b = convert(100, 'EUR')\nresult = [_a, _b]",
            expected: py.list(py.float(92), py.float(95)),
          },
          {
            kind: "expr",
            id: "cached",
            label: "repeated conversions between updates are computed once",
            hidden: true,
            expr: "set_rate('GBP', 0.79)\n_before = computed['n']\nfor _ in range(4):\n    convert(250, 'GBP')\nresult = computed['n'] - _before",
            expected: py.int(1),
          },
          {
            kind: "expr",
            id: "twice",
            label: "a rate changed twice",
            hidden: true,
            expr: "set_rate('EUR', 1.0)\n_a = convert(10, 'EUR')\nset_rate('EUR', 2.0)\n_b = convert(10, 'EUR')\nset_rate('EUR', 3.0)\nresult = [_a, _b, convert(10, 'EUR')]",
            expected: py.list(py.float(10), py.float(20), py.float(30)),
          },
          {
            kind: "expr",
            id: "new-currency",
            label: "a new currency added with set_rate",
            hidden: true,
            expr: "set_rate('JPY', 151.0)\nresult = convert(2, 'JPY')",
            expected: py.float(302),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q37-16",
    version: 2,
    slug: "benchmark-regressions",
    title: "Flag benchmark regressions in CI",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 12,
    requires: ["aggregate-call", "arithmetic", "assignment", "comp-if", "comparison", "continue-statement", "dict-iterate", "dict-literal", "for-loop", "function-def", "function-param", "function-return", "if-statement", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "precedence", "print-call", "print-several", "string-index", "top-level-indent"],
    prompt: "A CI job runs every benchmark several times on the main branch and on a pull request. Write `regressions(baseline, current, tolerance)` that lists the benchmarks whose best time got worse by more than `tolerance` (0.1 means 10%). Benchmarks that are new in `current` have nothing to compare with and are skipped.",
    spec: [
      ["Function", "`regressions(baseline, current, tolerance)`"],
      ["baseline, current", "dictionaries from benchmark name to a list of round times"],
      ["Returns", "the sorted names where `min(current) > min(baseline) * (1 + tolerance)`"],
    ],
    hiddenKinds: ["a new benchmark only in current", "a benchmark removed in current", "a slowdown exactly at the tolerance", "a noisy round that isn't a regression"],
    hints: [
      "Compare best (minimum) times, not averages, so one noisy round doesn't raise a false alarm.",
      "Only names present in both dictionaries can be compared.",
      "Exactly at the tolerance is not a regression: the test is strictly greater.",
    ],
    explanation: "For each benchmark in both runs, the best rounds are compared: a regression is a best time more than `1 + tolerance` times the baseline's. Using minima keeps one disturbed round from failing the build, skipping names missing from either side avoids KeyError on new or removed benchmarks, and sorting makes the report stable.",
    code: {
      starter: src`
def regressions(baseline, current, tolerance):
    return []

baseline = {"parse_orders": [0.40, 0.41], "export_csv": [1.2, 1.3]}
current = {"parse_orders": [0.52, 0.50], "export_csv": [1.25, 1.21], "new_report": [0.9]}
print(regressions(baseline, current, 0.1))
`,
      answer: src`
def regressions(baseline, current, tolerance):
    slower = []
    for name, times in current.items():
        if name not in baseline:
            continue
        if min(times) > min(baseline[name]) * (1 + tolerance):
            slower.append(name)
    return sorted(slower)

baseline = {"parse_orders": [0.40, 0.41], "export_csv": [1.2, 1.3]}
current = {"parse_orders": [0.52, 0.50], "export_csv": [1.25, 1.21], "new_report": [0.9]}
print(regressions(baseline, current, 0.1))
`,
      alternatives: [
        src`
def regressions(baseline, current, tolerance):
    shared = [name for name in current if name in baseline]
    return sorted(n for n in shared if min(current[n]) / min(baseline[n]) > 1 + tolerance)
`,
      ],
      wrong: [
        {
          code: src`
def regressions(baseline, current, tolerance):
    slower = []
    for name, times in current.items():
        if name in baseline and sum(times) / len(times) > sum(baseline[name]) / len(baseline[name]) * (1 + tolerance):
            slower.append(name)
    return sorted(slower)
`,
          fails: ["returns"],
          why: "averages let one noisy round report a regression that isn't there",
        },
        {
          code: src`
def regressions(baseline, current, tolerance):
    slower = []
    for name, times in current.items():
        if min(times) > min(baseline[name]) * (1 + tolerance):
            slower.append(name)
    return sorted(slower)
`,
          fails: ["returns"],
          why: "a benchmark that is new in the pull request raises KeyError",
        },
      ],
      task: {
        checks: [
          fn("returns", "regressions", [
            example([{ parse_orders: [0.4, 0.41], export_csv: [1.2, 1.3] }, { parse_orders: [0.52, 0.5], export_csv: [1.25, 1.21], new_report: [0.9] }, 0.1], ["parse_orders"]),
            example([{ a: [1.0] }, { a: [1.0] }, 0.05], []),
            example([{ b: [2.0], a: [1.0] }, { b: [3.0], a: [2.0] }, 0.2], ["a", "b"]),
            hiddenCase("a benchmark removed in current", [{ old: [1.0], kept: [1.0] }, { kept: [1.5] }, 0.1], ["kept"]),
            hiddenCase("a slowdown exactly at the tolerance", [{ x: [2.0] }, { x: [2.5] }, 0.25], []),
            hiddenCase("a noisy round that isn't a regression", [{ x: [1.0, 1.1] }, { x: [1.02, 9.0] }, 0.1], []),
          ], { label: "regressions() flags benchmarks whose best time got worse" }),
        ],
      },
    },
  },
  {
    id: "PY-Q37-19",
    version: 2,
    slug: "stream-filter-log",
    title: "Copy the matching lines of a huge log",
    format: "performance",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "comp-if", "comparison", "encoding-arg", "file-open", "for-loop", "function-def", "function-param", "function-return", "if-statement", "len-call", "list-comp", "list-literal", "membership", "newline-escape", "print-call", "print-several", "print-text", "reassignment", "string-find", "top-level-indent", "with-statement"],
    prompt: "Support needs every line about one customer from a log too big for memory. Write `copy_matching(source, target, needle)`: stream `source`, write each line that contains `needle` to `target` (unchanged, newline included), and return how many lines were copied. The hidden test measures the peak memory on a 60,000-line log.",
    spec: [
      ["Function", "`copy_matching(source, target, needle)`"],
      ["Returns", "the number of lines written"],
      ["Constraint", "open each file once; peak memory under 1 MB for a 60,000-line source (about 1.7 MB)"],
    ],
    hiddenKinds: ["no line matches", "every line matches", "a 60,000-line log (memory peak)"],
    hints: [
      "Open both files in one `with` (two files can share one statement).",
      "Iterate the source line by line; write a matching line straight away.",
      "Count as you write; nothing needs to be kept in a list.",
    ],
    explanation: "With both files open, each source line is read, tested and written immediately, so memory holds one buffer per file regardless of size. Collecting matches in a list first, or reading the whole file, makes the peak grow with the log.",
    code: {
      starter: src`
def copy_matching(source, target, needle):
    with open(source, encoding="utf-8") as f:
        matches = [line for line in f.readlines() if needle in line]
    with open(target, "w", encoding="utf-8") as out:
        out.writelines(matches)
    return len(matches)

with open("support.log", "w", encoding="utf-8") as f:
    f.write("C00077 login\nC01338 refund\nC00077 refund\n")
print(copy_matching("support.log", "c00077.log", "C00077"))
`,
      answer: src`
def copy_matching(source, target, needle):
    copied = 0
    with open(source, encoding="utf-8") as f, open(target, "w", encoding="utf-8") as out:
        for line in f:
            if needle in line:
                out.write(line)
                copied += 1
    return copied

with open("support.log", "w", encoding="utf-8") as f:
    f.write("C00077 login\nC01338 refund\nC00077 refund\n")
print(copy_matching("support.log", "c00077.log", "C00077"))
`,
      alternatives: [
        src`
def copy_matching(source, target, needle):
    count = 0
    with open(target, "w", encoding="utf-8") as out:
        with open(source, encoding="utf-8") as src:
            for line in src:
                if line.find(needle) != -1:
                    out.write(line)
                    count += 1
    return count
`,
      ],
      wrong: [
        {
          code: src`
def copy_matching(source, target, needle):
    with open(source, encoding="utf-8") as f:
        text = f.read()
    kept = [line + "\n" for line in text.splitlines() if needle in line]
    with open(target, "w", encoding="utf-8") as out:
        out.write("".join(kept))
    return len(kept)
`,
          fails: ["peak"],
          why: "right output, but the whole log is read into memory",
        },
        {
          code: src`
def copy_matching(source, target, needle):
    copied = 0
    with open(source, encoding="utf-8") as f, open(target, "w", encoding="utf-8") as out:
        for line in f:
            if needle in line:
                out.write(line.strip())
                copied += 1
    return copied
`,
          fails: ["copied"],
          why: "stripping the lines removes their newlines, so all matches end up on one line",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "copied",
            label: "copy_matching() copies the matching lines unchanged",
            show: "a 3-line log, needle 'C00077'",
            expr: "with open('s.log', 'w', encoding='utf-8') as _f:\n    _f.write('C00077 login\\nC01338 refund\\nC00077 refund\\n')\n_n = copy_matching('s.log', 'o.log', 'C00077')\nwith open('o.log', encoding='utf-8') as _f:\n    result = [_n, _f.read()]",
            expected: py.list(py.int(2), py.str("C00077 login\nC00077 refund\n")),
          },
          {
            kind: "expr",
            id: "none",
            label: "no matching line writes an empty file",
            hidden: true,
            expr: "with open('t.log', 'w', encoding='utf-8') as _f:\n    _f.write('a\\nb\\n')\n_n = copy_matching('t.log', 'p.log', 'zzz')\nwith open('p.log', encoding='utf-8') as _f:\n    result = [_n, _f.read()]",
            expected: py.list(py.int(0), py.str("")),
          },
          {
            kind: "expr",
            id: "peak",
            label: "peak memory under 1 MB for a 60,000-line log (the log itself is about 1.7 MB)",
            hidden: true,
            expr: "import tracemalloc as _tm\nwith open('big.log', 'w', encoding='utf-8') as _f:\n    for _i in range(60000):\n        _f.write(f'C{_i % 50:05} request {_i} handled\\n')\n_tm.start()\n_n = copy_matching('big.log', 'out.log', 'C00007')\n_c, _peak = _tm.get_traced_memory()\n_tm.stop()\nresult = [_n, _peak < 1000000]",
            expected: py.list(py.int(1200), yes),
          },
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q37-20",
    version: 2,
    slug: "borough-fare-totals",
    title: "Fare totals per borough, from a slow join to an index",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: ["arithmetic", "assignment", "boolean", "defaultdict-call", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "import-module", "lambda", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "precedence", "print-call", "print-several", "sort-key", "string-index", "top-level-indent"],
    prompt: "Each taxi trip has a pickup zone ID; the zone table maps zone IDs to boroughs. Write `borough_totals(trips, zones)` that adds up fares per borough. A month has millions of trips and the zone table 265 rows, so look zones up through an index built once, not by scanning the table per trip. Trips whose zone is missing from the table count under `\"Unknown\"`.",
    spec: [
      ["Function", "`borough_totals(trips, zones)`"],
      ["trips", "a list of `{\"pickup_zone_id\": int, \"fare\": float}`"],
      ["zones", "a list of `{\"zone_id\": int, \"borough\": str}`"],
      ["Returns", "a list of `(borough, total)` tuples, highest total first, ties by borough name"],
      ["Constraint", "the zone table is read about once: at most 600 reads for 300 zones and 400 trips"],
    ],
    hiddenKinds: ["a zone missing from the table", "two boroughs with equal totals", "no trips", "300 zones and 400 trips (read budget)"],
    hints: [
      "Build a dictionary from zone ID to borough once, before looking at any trip.",
      "Total the fares per borough with one pass over the trips, using `\"Unknown\"` for a missing zone.",
      "Sort the `(borough, total)` pairs with a key that puts the larger total first and breaks ties by name.",
    ],
    explanation: "Indexing the zones once makes every trip's lookup O(1), so the work is zones + trips instead of zones × trips. `dict.get(zone_id, \"Unknown\")` handles missing zones. Sorting by `(-total, borough)` gives the required order. The tempting refactor that sorts by total alone leaves ties in first-seen order.",
    code: {
      starter: src`
def borough_totals(trips, zones):
    return []

zones = [{"zone_id": 132, "borough": "Queens"}, {"zone_id": 186, "borough": "Manhattan"}, {"zone_id": 48, "borough": "Manhattan"}]
trips = [{"pickup_zone_id": 186, "fare": 40.8}, {"pickup_zone_id": 132, "fare": 70.0}, {"pickup_zone_id": 48, "fare": 7.2}]
print(borough_totals(trips, zones))
`,
      answer: src`
def borough_totals(trips, zones):
    borough_of = {}
    for zone in zones:
        borough_of[zone["zone_id"]] = zone["borough"]
    totals = {}
    for trip in trips:
        borough = borough_of.get(trip["pickup_zone_id"], "Unknown")
        totals[borough] = totals.get(borough, 0) + trip["fare"]
    return sorted(totals.items(), key=lambda pair: (-pair[1], pair[0]))

zones = [{"zone_id": 132, "borough": "Queens"}, {"zone_id": 186, "borough": "Manhattan"}, {"zone_id": 48, "borough": "Manhattan"}]
trips = [{"pickup_zone_id": 186, "fare": 40.8}, {"pickup_zone_id": 132, "fare": 70.0}, {"pickup_zone_id": 48, "fare": 7.2}]
print(borough_totals(trips, zones))
`,
      alternatives: [
        src`
from collections import defaultdict

def borough_totals(trips, zones):
    index = {z["zone_id"]: z["borough"] for z in zones}
    totals = defaultdict(float)
    for t in trips:
        totals[index.get(t["pickup_zone_id"], "Unknown")] += t["fare"]
    by_name = sorted(totals.items())
    return sorted(by_name, key=lambda item: item[1], reverse=True)
`,
      ],
      wrong: [
        {
          code: src`
def borough_totals(trips, zones):
    totals = {}
    for trip in trips:
        borough = "Unknown"
        for zone in zones:
            if zone["zone_id"] == trip["pickup_zone_id"]:
                borough = zone["borough"]
        totals[borough] = totals.get(borough, 0) + trip["fare"]
    return sorted(totals.items(), key=lambda pair: (-pair[1], pair[0]))
`,
          fails: ["reads"],
          why: "right totals, but the zone table is scanned for every trip",
        },
        {
          code: src`
def borough_totals(trips, zones):
    borough_of = {zone["zone_id"]: zone["borough"] for zone in zones}
    totals = {}
    for trip in trips:
        borough = borough_of.get(trip["pickup_zone_id"], "Unknown")
        totals[borough] = totals.get(borough, 0) + trip["fare"]
    return sorted(totals.items(), key=lambda pair: pair[1], reverse=True)
`,
          fails: ["returns"],
          why: "ties keep first-seen order instead of alphabetical order",
        },
      ],
      task: {
        checks: [
          fn("returns", "borough_totals", [
            example([[{ pickup_zone_id: 186, fare: 40.8 }, { pickup_zone_id: 132, fare: 70 }, { pickup_zone_id: 48, fare: 7.2 }], [{ zone_id: 132, borough: "Queens" }, { zone_id: 186, borough: "Manhattan" }, { zone_id: 48, borough: "Manhattan" }]], [pair("Queens", 70), pair("Manhattan", 48)]),
            example([[], [{ zone_id: 1, borough: "EWR" }]], []),
            example([[{ pickup_zone_id: 999, fare: 12.5 }], [{ zone_id: 1, borough: "EWR" }]], [pair("Unknown", 12.5)]),
            hiddenCase("two boroughs with equal totals", [[{ pickup_zone_id: 2, fare: 10 }, { pickup_zone_id: 1, fare: 10 }], [{ zone_id: 1, borough: "Bronx" }, { zone_id: 2, borough: "Queens" }]], [pair("Bronx", 10), pair("Queens", 10)]),
            hiddenCase("a zone missing from the table among known ones", [[{ pickup_zone_id: 3, fare: 5 }, { pickup_zone_id: 4, fare: 9 }], [{ zone_id: 3, borough: "Brooklyn" }]], [pair("Unknown", 9), pair("Brooklyn", 5)]),
          ], { label: "borough_totals() totals fares per borough", compare: { numbers: "int-float-equal" } }),
          fn("keeps-input", "borough_totals", [keepsInput([[{ pickup_zone_id: 1, fare: 3.5 }], [{ zone_id: 1, borough: "EWR" }]])], { label: "borough_totals() leaves its inputs unchanged" }),
          { kind: "expr", id: "reads", label: "the zone table is read about once", hidden: true, expr: readBudget("[{'zone_id': i, 'borough': f'B{i % 5}'} for i in range(300)]", "borough_totals([{'pickup_zone_id': i % 300, 'fare': 1.0} for i in range(400)], _data)", 600), expected: yes },
        ],
      },
    },
  },
  {
    id: "PY-Q37-22",
    version: 2,
    slug: "ways-to-pay",
    title: "Ways to pay an amount, with a cache",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 25,
    requires: ["arithmetic", "assignment", "comparison", "decorator-at", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-index", "list-literal", "logical", "lru-cache", "membership", "nested-loop", "precedence", "print-call", "print-several", "range-call", "string-index", "top-level-indent"],
    prompt: "A self-checkout suggests how many different combinations of coins and notes can pay an amount (order doesn't matter: 2 + 5 and 5 + 2 are one way). The natural recursion: the ways to pay `amount` with denominations from position `i` on are the ways that use `denominations[i]` at least once plus the ways that skip it. Without a cache this repeats subproblems exponentially; write `ways_to_pay(amount, denominations)` with one.",
    spec: [
      ["Function", "`ways_to_pay(amount, denominations)`"],
      ["Inputs", "a whole-number amount in cents (≥ 0) and a list of distinct positive denominations"],
      ["Returns", "the number of combinations; `1` for an amount of 0 (pay nothing), `0` if it can't be paid"],
      ["Constraint", "300 cents with 8 denominations must answer within the time limit"],
    ],
    hiddenKinds: ["an amount that can't be paid", "an amount of zero", "denominations in any order", "300 cents with 8 denominations"],
    hints: [
      "Define a helper `count(remaining, i)`: the ways using denominations from position `i` on. It returns 1 when `remaining` is 0 and 0 when `remaining` is negative or no denominations are left.",
      "Otherwise it is `count(remaining - denominations[i], i) + count(remaining, i + 1)`: use this denomination again, or move past it for good.",
      "Put `@cache` on the helper (defined inside the function so the denominations are fixed), which turns the exponential recursion into one computation per `(remaining, i)` pair.",
    ],
    explanation: "Each `(remaining, i)` pair is computed once and then served from the cache, so the work is amount × number of denominations instead of exponential. Moving past a denomination for good (`i + 1`) is what makes order irrelevant; recursing over all denominations at every step counts 2 + 5 and 5 + 2 separately. Defining the cached helper inside the function means each call gets a cache for its own denominations.",
    code: {
      starter: src`
def ways_to_pay(amount, denominations):
    return 0

print(ways_to_pay(5, [1, 2, 5]))
`,
      answer: src`
from functools import cache

def ways_to_pay(amount, denominations):
    @cache
    def count(remaining, i):
        if remaining == 0:
            return 1
        if remaining < 0 or i == len(denominations):
            return 0
        return count(remaining - denominations[i], i) + count(remaining, i + 1)

    return count(amount, 0)

print(ways_to_pay(5, [1, 2, 5]))
`,
      alternatives: [
        src`
def ways_to_pay(amount, denominations):
    ways = [1] + [0] * amount
    for coin in denominations:
        for total in range(coin, amount + 1):
            ways[total] += ways[total - coin]
    return ways[amount]
`,
      ],
      wrong: [
        {
          code: src`
from functools import cache

def ways_to_pay(amount, denominations):
    @cache
    def count(remaining):
        if remaining == 0:
            return 1
        if remaining < 0:
            return 0
        total = 0
        for coin in denominations:
            total += count(remaining - coin)
        return total

    return count(amount)
`,
          fails: ["returns"],
          why: "trying every denomination at every step counts orderings: 2 + 5 and 5 + 2 become two ways",
        },
        {
          code: src`
from functools import cache

def ways_to_pay(amount, denominations):
    @cache
    def count(remaining, i):
        if remaining == 0:
            return 1
        if remaining < 0 or i == len(denominations):
            return 0
        return count(remaining - denominations[i], i + 1) + count(remaining, i + 1)

    return count(amount, 0)
`,
          fails: ["returns"],
          why: "moving on after using a denomination lets each one be used at most once, so 1 + 1 + 1 + 2 is never counted",
        },
      ],
      task: {
        checks: [
          fn("returns", "ways_to_pay", [
            example([5, [1, 2, 5]], 4),
            example([10, [2, 5, 3, 6]], 5),
            example([0, [1]], 1),
            hiddenCase("an amount that can't be paid", [3, [2]], 0),
            hiddenCase("a dollar in US coins", [100, [1, 5, 10, 25, 50]], 292),
            hiddenCase("300 cents with 8 denominations", [300, [1, 2, 5, 10, 20, 50, 100, 200]], 471363),
          ], { label: "ways_to_pay() counts the combinations" }),
        ],
      },
    },
  },
];

