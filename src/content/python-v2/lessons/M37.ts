/**
 * M37 Profiling & Optimization: five lessons (PY-L37-01 … PY-L37-05).
 *
 * Measure, find the cause, fix it, prove it. timeit measures small pieces of code fairly (many runs, several rounds,
 * the minimum); cProfile and pstats count every call to show where the time goes; functools caches remember results
 * of pure functions; streaming file I/O keeps memory flat; and the biggest wins come from changing the algorithm.
 *
 * Grading never uses a stopwatch reading as the answer. Timing code is graded with an injected fake timer (the same
 * dependency-injection idea as M29), profiles by their call counts (deterministic), caches by hits, misses and calls,
 * I/O by tracemalloc peaks and counted open() calls, and optimisations by counted comparisons or reads. Lesson examples
 * that do time code print comparisons with a wide margin (a ratio, never a number of seconds), because timings differ
 * between machines and runs.
 * Version 2: rewritten from a five-print module; saved progress from version 1 does not count as mastery.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput } from "../checks";
import { py } from "@/engine/python/values";
import { readBudget } from "./M35";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const yes = py.bool(true);

/** A fake clock for timing checks: each call returns the next value of `ticks`. */
const fakeTimer = (ticks: number[]) => `_ticks = iter(${JSON.stringify(ticks)})\ndef _timer():\n    return next(_ticks)`;

/** Count the open() calls made while `call` runs (the learner's code calls the built-in open). */
const countOpens = (setup: string, call: string, then: string) =>
  [
    "import builtins as _b",
    setup,
    "_real_open = _b.open",
    "_opens = [0]",
    "def _counting_open(*a, **k):",
    "    _opens[0] += 1",
    "    return _real_open(*a, **k)",
    "_b.open = _counting_open",
    "try:",
    `    ${call}`,
    "finally:",
    "    _b.open = _real_open",
    then,
  ].join("\n");

/**
 * Count both kinds of work on a list of strings: every item read from the list (iteration or indexing) and every ==
 * involving one of its strings. Rebuilding a set from the list each time and scanning the list with `in` both show up.
 */
const workBudget = (build: string, call: string, limit: number) =>
  [
    "_work = [0]",
    "class _Code(str):",
    "    def __eq__(self, other):",
    "        _work[0] += 1",
    "        return str.__eq__(self, other)",
    "    __hash__ = str.__hash__",
    "class _Counted(list):",
    "    def __getitem__(self, i):",
    "        _work[0] += 1",
    "        return list.__getitem__(self, i)",
    "    def __iter__(self):",
    "        for _x in list.__iter__(self):",
    "            _work[0] += 1",
    "            yield _x",
    `_data = _Counted(${build})`,
    "_work[0] = 0",
    call,
    `result = _work[0] <= ${limit}`,
  ].join("\n");

export const m37Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L37-01 timeit
  {
    id: "PY-L37-01",
    version: 2,
    slug: "timeit-benchmarks",
    title: "timeit: measuring small pieces of code fairly",
    lede: "One stopwatch reading is mostly noise. timeit runs code thousands of times, in several rounds, and the best round per call is the number worth comparing.",
    focus: "Measure code with timeit and compare implementations by their best per-call time.",
    minutes: 20,
    objectives: [
      "Use `timeit.timeit` and `timeit.repeat` with a function or lambda and a `number` of runs",
      "Turn repeat results into a per-call time using the minimum, and explain why",
      "Compare two implementations by a ratio, on the same input, and not trust tiny differences",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "lambda", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-loop", "none-value", "print-call", "print-several", "range-call", "reassignment", "string-format", "string-index", "top-level-indent"],
    teaches: ["timeit-call", "bench-compare"],
    blocks: [
      {
        kind: "text",
        md: "Timing a single call is unreliable: it may take microseconds, the clock has limited resolution, and the computer is doing other things. `timeit` solves this by running the code `number` times in a loop and returning the **total** seconds. `timeit.repeat(..., repeat=5)` does that several times and returns a list of totals.\n\nTake the **minimum** of those totals: the fastest round is the one least disturbed by other work, so it is the best estimate of the code's own cost. Divide by `number` for a per-call time. Then compare implementations by their **ratio**: a 30× difference survives any machine; a 5% one may not even survive a second run.",
      },
      {
        kind: "example",
        title: "Looking up a SKU: list against set",
        code: src`
import timeit

codes = [f"SKU-{n:05}" for n in range(5000)]
as_list = codes
as_set = set(codes)
list_time = min(timeit.repeat(lambda: "SKU-04999" in as_list, number=2000, repeat=3))
set_time = min(timeit.repeat(lambda: "SKU-04999" in as_set, number=2000, repeat=3))
print(list_time > set_time, list_time / set_time > 20)
`,
        output: "True True\n",
        note: "The list scans 5,000 codes per lookup, the set hashes once (“Hash-based problems: sets and dictionaries”). The ratio is in the hundreds here; the exact figure changes from run to run and machine to machine, which is why the program prints comparisons, not seconds.",
      },
      {
        kind: "text",
        md: "A fair benchmark measures the same work on the same input, keeps setup (building the data) **outside** the timed code, and repeats enough to see past noise. Wrapping that in a function makes it reusable. Passing the clock in as a parameter (`timer=time.perf_counter`) is the the Advanced OOP & Design module dependency-injection idea: the real program uses the real clock, and a test can pass a fake one.",
      },
      {
        kind: "example",
        title: "A reusable benchmark helper",
        code: src`
import time
import timeit

def best_per_call(func, number, repeat, timer=time.perf_counter):
    totals = timeit.Timer(func, timer=timer).repeat(repeat=repeat, number=number)
    return min(totals) / number

def dedupe_slow(items):
    kept = []
    for item in items:
        if item not in kept:
            kept.append(item)
    return kept

def dedupe_fast(items):
    return list(dict.fromkeys(items))

skus = [f"SKU-{n % 400}" for n in range(2000)]
print(dedupe_slow(skus) == dedupe_fast(skus))
slow = best_per_call(lambda: dedupe_slow(skus), number=5, repeat=3)
fast = best_per_call(lambda: dedupe_fast(skus), number=5, repeat=3)
print(slow / fast > 10)
`,
        output: "True\nTrue\n",
        note: "First check that both versions give the **same answer**: a fast wrong function is worthless. Then compare: the list-based dedupe checks each SKU against up to 400 kept ones, the dictionary version hashes once.",
      },
      {
        kind: "text",
        md: "**When to use it:** to decide between two ways of writing a small, hot piece of code, or to confirm that an optimisation helped. **Mistakes to avoid:** timing one call; including setup in the timed code; comparing results from different inputs or machines; using the average of noisy rounds instead of the minimum; and celebrating a 3% difference. For a whole program, measure *where* the time goes first (cProfile, next lesson).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Use the best round",
      prompt: "`per_call` turns `timeit.repeat` totals into a per-call time, but it uses the **first** round, which is often slowed down by warm-up. Change it to use the fastest round, and run it.",
      spec: [
        ["Function", "`per_call(totals, number)`"],
        ["totals", "the list `timeit.repeat` returned: seconds for `number` calls, one entry per round"],
        ["Returns", "the per-call time of the fastest round"],
        ["Example", "`per_call([0.5, 0.2, 0.3], 1000)` → `0.0002`"],
      ],
      starter: src`
def per_call(totals, number):
    return totals[0] / number

print(per_call([0.5, 0.2, 0.3], 1000))
`,
      answer: src`
def per_call(totals, number):
    return min(totals) / number

print(per_call([0.5, 0.2, 0.3], 1000))
`,
      wrong: [
        {
          code: src`
def per_call(totals, number):
    return sum(totals) / len(totals) / number
`,
          fails: ["returns"],
          why: "the average includes the disturbed rounds, so it overstates the code's own cost",
        },
      ],
      hints: [
        "Of the rounds, which one was least disturbed by other work?",
        "`min` picks the smallest total.",
        "Divide that total by `number`.",
      ],
      task: {
        checks: [
          fn("returns", "per_call", [
            example([[0.5, 0.2, 0.3], 1000], 0.0002),
            hiddenCase("the best round last", [[0.9, 0.8, 0.4], 100], 0.004),
            hiddenCase("a single round", [[2.5], 10], 0.25),
          ], { label: "per_call() uses the fastest round" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A benchmark function with a replaceable clock",
        prompt: "Write `benchmark(func, number, repeat, timer=time.perf_counter)`: call `func` (no arguments) `number` times per round, for `repeat` rounds, timing each round with `timer`, and return the **best per-call time**. Use `timeit.Timer`. The checker passes a fake `timer` that returns preset readings, so your result can be checked exactly, and counts the calls to `func`.",
        spec: [
          ["Function", "`benchmark(func, number, repeat, timer=time.perf_counter)`"],
          ["Timing", "each round reads the timer once before and once after its `number` calls"],
          ["Returns", "the smallest round total divided by `number`"],
          ["Example", "readings `0, 4, 10, 12, 20, 29` with `number=2, repeat=3` → rounds of 4, 2 and 9 → `1.0`"],
        ],
        starter: src`
import time
import timeit

def benchmark(func, number, repeat, timer=time.perf_counter):
    return 0.0

def total_fares():
    return sum([40.8, 7.2, 17.2])

print(benchmark(total_fares, 1000, 3) > 0)
`,
        answer: src`
import time
import timeit

def benchmark(func, number, repeat, timer=time.perf_counter):
    totals = timeit.Timer(func, timer=timer).repeat(repeat=repeat, number=number)
    return min(totals) / number

def total_fares():
    return sum([40.8, 7.2, 17.2])

print(benchmark(total_fares, 1000, 3) > 0)
`,
        alternatives: [
          src`
import time

def benchmark(func, number, repeat, timer=time.perf_counter):
    best = None
    for _ in range(repeat):
        start = timer()
        for _ in range(number):
            func()
        elapsed = timer() - start
        if best is None or elapsed < best:
            best = elapsed
    return best / number
`,
        ],
        wrong: [
          {
            code: src`
import time
import timeit

def benchmark(func, number, repeat, timer=time.perf_counter):
    totals = timeit.Timer(func, timer=timer).repeat(repeat=repeat, number=number)
    return min(totals)
`,
            fails: ["result", "uneven"],
            why: "it returns the round total, not the time per call",
          },
          {
            code: src`
import time
import timeit

def benchmark(func, number, repeat, timer=time.perf_counter):
    return timeit.timeit(func, number=number) / number
`,
            fails: ["result", "calls", "uneven"],
            why: "it ignores the timer and the rounds: one round, timed with the real clock",
          },
        ],
        hints: [
          "`timeit.Timer(func, timer=timer)` builds a timer for a callable; its `repeat(repeat=..., number=...)` returns one total per round.",
          "Each total covers `number` calls of `func`.",
          "Take the smallest total and divide by `number`.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "result",
              label: "benchmark() returns the best round divided by number",
              show: "timer readings 0, 4, 10, 12, 20, 29; number=2, repeat=3",
              expr: `${fakeTimer([0, 4, 10, 12, 20, 29])}\nresult = benchmark(lambda: None, 2, 3, timer=_timer)`,
              expected: py.float(1),
            },
            {
              kind: "expr",
              id: "calls",
              label: "func is called number × repeat times",
              hidden: true,
              expr: `${fakeTimer([0, 1, 1, 2, 2, 3, 3, 4])}\n_n = [0]\ndef _f():\n    _n[0] += 1\nbenchmark(_f, 7, 4, timer=_timer)\nresult = _n[0]`,
              expected: py.int(28),
            },
            {
              kind: "expr",
              id: "uneven",
              label: "the best round wins even when it comes last",
              hidden: true,
              expr: `${fakeTimer([0, 50, 50, 90, 90, 100])}\nresult = benchmark(lambda: None, 10, 3, timer=_timer)`,
              expected: py.float(1),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Is the new version really faster?",
        prompt: "A pull request claims a speed-up. You have the `timeit.repeat` totals for the old and new versions (same `number`, same input). Write `verdict(old_totals, new_totals)`: compare their **best** rounds. If either is at least 10% faster than the other, say which; otherwise the difference is noise.",
        spec: [
          ["Function", "`verdict(old_totals, new_totals)`"],
          ["Returns", "`\"new is faster\"` when best(old) ≥ 1.1 × best(new); `\"old is faster\"` when best(new) ≥ 1.1 × best(old); otherwise `\"no clear difference\"`"],
          ["Example", "`[0.52, 0.50, 0.61]` vs `[0.21, 0.20, 0.30]` → `\"new is faster\"`"],
        ],
        starter: src`
def verdict(old_totals, new_totals):
    return "no clear difference"

print(verdict([0.52, 0.50, 0.61], [0.21, 0.20, 0.30]))
`,
        answer: src`
def verdict(old_totals, new_totals):
    old_best = min(old_totals)
    new_best = min(new_totals)
    if old_best >= 1.1 * new_best:
        return "new is faster"
    if new_best >= 1.1 * old_best:
        return "old is faster"
    return "no clear difference"

print(verdict([0.52, 0.50, 0.61], [0.21, 0.20, 0.30]))
`,
        alternatives: [
          src`
def verdict(old_totals, new_totals):
    ratio = min(old_totals) / min(new_totals)
    if ratio >= 1.1:
        return "new is faster"
    if ratio <= 1 / 1.1:
        return "old is faster"
    return "no clear difference"
`,
        ],
        wrong: [
          {
            code: src`
def verdict(old_totals, new_totals):
    old_avg = sum(old_totals) / len(old_totals)
    new_avg = sum(new_totals) / len(new_totals)
    if old_avg >= 1.1 * new_avg:
        return "new is faster"
    if new_avg >= 1.1 * old_avg:
        return "old is faster"
    return "no clear difference"
`,
            fails: ["returns"],
            why: "averages let one disturbed round decide the verdict",
          },
          {
            code: src`
def verdict(old_totals, new_totals):
    if min(old_totals) > min(new_totals):
        return "new is faster"
    if min(new_totals) > min(old_totals):
        return "old is faster"
    return "no clear difference"
`,
            fails: ["returns"],
            why: "without a margin, a 1% difference (noise) is reported as a speed-up",
          },
        ],
        hints: [
          "Reduce each list to its best (smallest) round first.",
          "A 10% margin means one best must be at least 1.1 times the other.",
          "Check both directions, and fall back to *no clear difference*.",
        ],
        task: {
          checks: [
            fn("returns", "verdict", [
              example([[0.52, 0.5, 0.61], [0.21, 0.2, 0.3]], "new is faster"),
              example([[0.2, 0.22], [0.205, 0.201]], "no clear difference"),
              example([[0.1, 0.12], [0.2, 0.15]], "old is faster"),
              hiddenCase("one disturbed round in the new version", [[0.5, 0.5, 0.5], [0.3, 2.0, 0.31]], "new is faster"),
              hiddenCase("exactly ten percent", [[1.1], [1.0]], "new is faster"),
              hiddenCase("a one percent difference", [[1.01, 1.2], [1.0, 1.1]], "no clear difference"),
            ], { label: "verdict() compares the best rounds with a 10% margin" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
totals = [0.84, 0.61, 0.66, 0.97]
number = 1000
print(min(totals) / number)
`,
        choices: ["0.00061", "0.00077", "0.61", "0.00097"],
        answer: 0,
        why: "Each total is the time for 1,000 calls; the best round (0.61 s) divided by 1,000 is 0.00061 s per call.",
      },
      {
        id: "q2",
        prompt: "A common mistake: this benchmark compares two ways of building a report. What is wrong with it?",
        choices: [
          "The data is loaded inside the timed lambda, so most of the measured time is loading, not the code being compared",
          "timeit can't time lambdas",
          "`number=100` is too many runs",
          "Nothing is wrong",
        ],
        answer: 0,
        why: "`timeit.timeit(lambda: build_report(load_orders()), number=100)` times `load_orders` too. Load once outside the timed code, then time only the part you are comparing.",
      },
      {
        id: "q3",
        prompt: "Version B's best time is 3% lower than version A's on your laptop. What should you conclude?",
        choices: [
          "Not much: a 3% gap is within run-to-run noise, so keep the clearer version",
          "B is faster everywhere",
          "A must be broken",
          "Average the rounds instead, which will settle it",
        ],
        answer: 0,
        why: "Small differences flip between runs and machines. Optimise for differences of 2× or 10×, and keep readability otherwise.",
      },
    ],
    review: [
      "`timeit` runs code `number` times; `repeat` gives several rounds; best round ÷ `number` = per-call time.",
      "Same input, setup outside the timing, results checked equal, compare by ratio.",
      "Inject the clock (`timer=`) so timing code can be tested exactly.",
      "Next: cProfile, which shows where a whole program spends its time.",
    ],
  },

  // ------------------------------------------------------------------ PY-L37-02 cProfile
  {
    id: "PY-L37-02",
    version: 2,
    slug: "cprofile-hotspots",
    title: "cProfile: where does the time go?",
    lede: "Programs are rarely slow everywhere. A profiler records every function call, so you can see which functions are called most and which take the most time, and optimise the right one.",
    focus: "Profile a program with cProfile and read pstats to find the hotspot.",
    minutes: 22,
    objectives: [
      "Run a function under `cProfile.Profile` with `runcall`",
      "Read pstats columns: ncalls, tottime and cumtime",
      "Use call counts to find work that is repeated more than it should be",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "comp-if", "comparison", "conversion", "dict-comp", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "none-value", "precedence", "print-call", "print-several", "print-text", "star-args", "string-index", "string-method", "string-split", "top-level-indent"],
    teaches: ["profile-call"],
    blocks: [
      {
        kind: "text",
        md: "Guessing where a program is slow is usually wrong. `cProfile` (in the standard library) records **every function call** while it is enabled: how many times each function was called (**ncalls**), the time spent in its own code (**tottime**) and the time including everything it called (**cumtime**). `pstats.Stats(profiler)` turns the records into a table you can sort (`sort_stats(\"cumulative\")`) and print (`print_stats(10)`).\n\nTimes vary between runs, but call counts don't, so counts are the most reliable first clue: a helper called 10,000 times for 100 records is doing something 100 times too often.",
      },
      {
        kind: "example",
        title: "Profiling an order report",
        code: src`
import cProfile
import pstats

def parse_price(text):
    return float(text.strip().replace("$", ""))

def order_total(lines):
    total = 0
    for line in lines:
        total += parse_price(line["price"]) * line["qty"]
    return total

def report(orders):
    totals = []
    for order in orders:
        totals.append(order_total(order))
    return max(totals)

orders = [[{"price": " $7.49", "qty": 2}, {"price": "$31.00 ", "qty": 1}]] * 500
profiler = cProfile.Profile()
best = profiler.runcall(report, orders)
stats = pstats.Stats(profiler)
counts = []
for (filename, line, name), (primitive, total, own, cumulative, callers) in stats.stats.items():
    if filename != "~":
        counts.append((total, name))
for total, name in sorted(counts, reverse=True):
    print(name, total)
print(round(best, 2))
`,
        output: "parse_price 1000\norder_total 500\nreport 1\n45.98\n",
        note: "`runcall` runs the function under the profiler and returns its result. `stats.stats` maps `(filename, line, function name)` to a tuple whose second item is the total number of calls. Built-ins such as `float` are listed under the filename `~`; the example skips them. `print_stats()` prints the same data as a table with times.",
      },
      {
        kind: "text",
        md: "In the printed table, `ncalls` can show two numbers, such as `177/1` for a recursive function: total calls / *primitive* calls (calls not made by the function itself). `tottime` is where to look for a function that is slow in its own right; `cumtime` shows which top-level step contains the slowness. The usual workflow: profile, sort by cumulative time, follow the biggest branch down to the function whose own time or call count is out of proportion, fix it, and profile again.",
      },
      {
        kind: "example",
        title: "Recursive calls in the table",
        code: src`
import cProfile
import io
import pstats

def ways(steps):
    if steps <= 1:
        return 1
    return ways(steps - 1) + ways(steps - 2)

profiler = cProfile.Profile()
profiler.runcall(ways, 10)
out = io.StringIO()
pstats.Stats(profiler, stream=out).sort_stats("ncalls").print_stats(1)
for line in out.getvalue().splitlines():
    if "ways" in line:
        print(line.split()[0], line.split()[-1])
`,
        output: "177/1 main.py:5(ways)\n",
        note: "One call from outside (primitive) led to 177 calls in total, the repeated work “Recursion trade-offs: depth and repeated work” counted by hand. The printed table also has the time columns, which are left out here because they change on every run.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever a whole program or request is slow and you don't know why. Profile with realistic data. **Mistakes to avoid:** optimising before profiling; reading `cumtime` of a top-level function as its own cost; and profiling a toy input where start-up dominates. Profiling adds overhead to every call, so use the numbers to compare functions within one profile, not as exact timings.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count every call, not just the first",
      prompt: "`count_calls` profiles `func(arg)` and returns how often the function called `name` ran. It reads the **primitive** count (the first number of the tuple), which for a recursive function is only the calls from outside. Change it to read the **total** number of calls, and run it.",
      spec: [
        ["Function", "`count_calls(func, arg, name)`"],
        ["Returns", "the total number of calls to the function called `name` while `func(arg)` ran, or 0 if it never ran"],
        ["Example", "`count_calls(ways, 10, \"ways\")` → `177`"],
      ],
      starter: src`
import cProfile
import pstats

def count_calls(func, arg, name):
    profiler = cProfile.Profile()
    profiler.runcall(func, arg)
    for (filename, line, function), counts in pstats.Stats(profiler).stats.items():
        if function == name:
            return counts[0]
    return 0

def ways(steps):
    if steps <= 1:
        return 1
    return ways(steps - 1) + ways(steps - 2)

print(count_calls(ways, 10, "ways"))
`,
      answer: src`
import cProfile
import pstats

def count_calls(func, arg, name):
    profiler = cProfile.Profile()
    profiler.runcall(func, arg)
    for (filename, line, function), counts in pstats.Stats(profiler).stats.items():
        if function == name:
            return counts[1]
    return 0

def ways(steps):
    if steps <= 1:
        return 1
    return ways(steps - 1) + ways(steps - 2)

print(count_calls(ways, 10, "ways"))
`,
      wrong: [
        {
          code: src`
import cProfile
import pstats

def count_calls(func, arg, name):
    profiler = cProfile.Profile()
    profiler.runcall(func, arg)
    return len(pstats.Stats(profiler).stats)
`,
          fails: ["calls", "missing"],
          why: "it counts how many different functions ran, not how often the named one did",
        },
      ],
      hints: [
        "Each value in `stats.stats` is a tuple: primitive calls, total calls, own time, cumulative time, callers.",
        "For a recursive function the first two numbers differ.",
        "Use the item at index 1.",
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "calls",
            label: "count_calls() reports the total calls of the named function",
            show: "count_calls(ways, 10, 'ways') and count_calls(ways, 4, 'ways')",
            expr: "def _ways(n):\n    if n <= 1:\n        return 1\n    return _ways(n - 1) + _ways(n - 2)\nresult = [count_calls(_ways, 10, '_ways'), count_calls(_ways, 4, '_ways')]",
            expected: py.list(py.int(177), py.int(9)),
          },
          {
            kind: "expr",
            id: "missing",
            label: "a function that never ran gives 0",
            hidden: true,
            expr: "def _noop(x):\n    return x\nresult = count_calls(_noop, 3, 'parse_price')",
            expected: py.int(0),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A call-count report",
        prompt: "Write `call_counts(func, *args)` that runs `func(*args)` under cProfile and returns a dictionary from function name to its **total** number of calls, for the program's own functions only: leave out built-ins (filename `\"~\"`). A team uses it in tests to catch a change that suddenly makes a helper run thousands of times.",
        spec: [
          ["Function", "`call_counts(func, *args)`"],
          ["Returns", "`{function name: total calls}` for every non-built-in function that ran, including `func` itself"],
          ["Example", "profiling the order report → `{'report': 1, 'order_total': 500, 'parse_price': 1000}` (key order doesn't matter)"],
        ],
        starter: src`
import cProfile
import pstats

def call_counts(func, *args):
    return {}

def parse_price(text):
    return float(text.strip().replace("$", ""))

def order_total(lines):
    return sum(parse_price(line["price"]) * line["qty"] for line in lines)

orders = [[{"price": "$7.49", "qty": 2}]] * 3
print(call_counts(lambda: [order_total(order) for order in orders]))
`,
        answer: src`
import cProfile
import pstats

def call_counts(func, *args):
    profiler = cProfile.Profile()
    profiler.runcall(func, *args)
    counts = {}
    for (filename, line, name), values in pstats.Stats(profiler).stats.items():
        if filename != "~":
            counts[name] = values[1]
    return counts

def parse_price(text):
    return float(text.strip().replace("$", ""))

def order_total(lines):
    return sum(parse_price(line["price"]) * line["qty"] for line in lines)

orders = [[{"price": "$7.49", "qty": 2}]] * 3
print(call_counts(lambda: [order_total(order) for order in orders]))
`,
        alternatives: [
          src`
import cProfile
import pstats

def call_counts(func, *args):
    p = cProfile.Profile()
    p.enable()
    func(*args)
    p.disable()
    return {key[2]: value[1] for key, value in pstats.Stats(p).stats.items() if key[0] != "~"}
`,
        ],
        wrong: [
          {
            code: src`
import cProfile
import pstats

def call_counts(func, *args):
    profiler = cProfile.Profile()
    profiler.runcall(func, *args)
    counts = {}
    for (filename, line, name), values in pstats.Stats(profiler).stats.items():
        counts[name] = values[1]
    return counts
`,
            fails: ["args"],
            why: "built-ins such as `float` and `strip` are reported too",
          },
          {
            code: src`
import cProfile
import pstats

def call_counts(func, *args):
    profiler = cProfile.Profile()
    profiler.runcall(func, *args)
    counts = {}
    for (filename, line, name), values in pstats.Stats(profiler).stats.items():
        if filename != "~":
            counts[name] = values[0]
    return counts
`,
            fails: ["recursive"],
            why: "the primitive count hides the recursive calls",
          },
        ],
        hints: [
          "`runcall` takes the function followed by its arguments, so `*args` can be passed straight on.",
          "Keys of `stats.stats` are `(filename, line, name)`; built-ins have the filename `\"~\"`.",
          "Use the total-calls number (index 1) as each value.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "report",
              label: "call_counts() counts the program's own function calls",
              show: "call_counts(report, orders)",
              expr: "def _parse(t):\n    return float(t.strip())\ndef _total(lines):\n    return sum(_parse(l) for l in lines)\ndef _report(orders):\n    return [_total(o) for o in orders]\n_c = call_counts(_report, [['1.5', '2'], ['3']])\nresult = {k: _c[k] for k in ['_report', '_total', '_parse']}",
              expected: py.dict([[py.str("_report"), py.int(1)], [py.str("_total"), py.int(2)], [py.str("_parse"), py.int(3)]]),
            },
            {
              kind: "expr",
              id: "args",
              label: "arguments are passed on and built-ins are left out",
              hidden: true,
              expr: "def _add(a, b):\n    return a + b\n_c = call_counts(_add, 2, 3)\nresult = _c",
              expected: py.dict([[py.str("_add"), py.int(1)]]),
            },
            {
              kind: "expr",
              id: "recursive",
              label: "recursive calls are all counted",
              hidden: true,
              expr: "def _down(n):\n    return 0 if n == 0 else _down(n - 1)\nresult = call_counts(_down, 6)['_down']",
              expected: py.int(7),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "How many helper calls per record?",
        prompt: "A data team suspects their pipeline parses each record several times. Write `calls_per_item(func, items, helper)`: profile `func(items)` and return how many times the function named `helper` ran **per item** (total calls ÷ number of items). Return `0.0` if the helper never ran, and `None` for an empty list of items.",
        spec: [
          ["Function", "`calls_per_item(func, items, helper)`"],
          ["Returns", "total calls of `helper` divided by `len(items)` (a float); `0.0` if it never ran; `None` when `items` is empty"],
          ["Example", "a pipeline that parses every record three times → `3.0`"],
        ],
        starter: src`
import cProfile
import pstats

def calls_per_item(func, items, helper):
    return None

def parse(record):
    return record.split(",")

def pipeline(records):
    valid = [r for r in records if len(parse(r)) == 3]
    ids = [parse(r)[0] for r in valid]
    zones = [parse(r)[2] for r in valid]
    return ids, zones

print(calls_per_item(pipeline, ["16126,2,186", "16127,1,264"], "parse"))
`,
        answer: src`
import cProfile
import pstats

def calls_per_item(func, items, helper):
    if not items:
        return None
    profiler = cProfile.Profile()
    profiler.runcall(func, items)
    calls = 0
    for (filename, line, name), values in pstats.Stats(profiler).stats.items():
        if name == helper and filename != "~":
            calls += values[1]
    return calls / len(items)

def parse(record):
    return record.split(",")

def pipeline(records):
    valid = [r for r in records if len(parse(r)) == 3]
    ids = [parse(r)[0] for r in valid]
    zones = [parse(r)[2] for r in valid]
    return ids, zones

print(calls_per_item(pipeline, ["16126,2,186", "16127,1,264"], "parse"))
`,
        alternatives: [
          src`
import cProfile
import pstats

def calls_per_item(func, items, helper):
    if len(items) == 0:
        return None
    prof = cProfile.Profile()
    prof.enable()
    func(items)
    prof.disable()
    stats = pstats.Stats(prof).stats
    total = sum(v[1] for k, v in stats.items() if k[2] == helper and k[0] != "~")
    return total / len(items)
`,
        ],
        wrong: [
          {
            code: src`
import cProfile
import pstats

def calls_per_item(func, items, helper):
    profiler = cProfile.Profile()
    profiler.runcall(func, items)
    for (filename, line, name), values in pstats.Stats(profiler).stats.items():
        if name == helper:
            return values[1] / len(items)
    return 0.0
`,
            fails: ["empty"],
            why: "an empty list divides by zero instead of returning None",
          },
          {
            code: src`
import cProfile
import pstats

def calls_per_item(func, items, helper):
    if not items:
        return None
    profiler = cProfile.Profile()
    profiler.runcall(func, items)
    for (filename, line, name), values in pstats.Stats(profiler).stats.items():
        if name == helper:
            return float(values[1])
    return 0.0
`,
            fails: ["ratio"],
            why: "it returns the total number of calls, not the number per item",
          },
        ],
        hints: [
          "Handle the empty list first, before dividing by its length.",
          "Profile `func(items)` with `runcall` and look up the entry whose function name is `helper`.",
          "Divide its total calls by the number of items; no entry means 0 calls.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "ratio",
              label: "calls_per_item() divides the helper's calls by the number of items",
              show: "a pipeline that parses each record three times",
              expr: "def _parse(r):\n    return r.split(',')\ndef _pipe(rs):\n    v = [r for r in rs if len(_parse(r)) == 3]\n    a = [_parse(r)[0] for r in v]\n    b = [_parse(r)[2] for r in v]\n    return a, b\nresult = [calls_per_item(_pipe, ['1,2,3', '4,5,6'], '_parse'), calls_per_item(_pipe, ['1,2', '4,5,6'], '_parse')]",
              expected: py.list(py.float(3), py.float(2)),
            },
            {
              kind: "expr",
              id: "never",
              label: "a helper that never ran gives 0.0",
              hidden: true,
              expr: "def _pipe(rs):\n    return len(rs)\nresult = calls_per_item(_pipe, ['a', 'b'], 'parse')",
              expected: py.float(0),
            },
            {
              kind: "expr",
              id: "empty",
              label: "no items gives None",
              hidden: true,
              expr: "def _pipe(rs):\n    return rs\nresult = calls_per_item(_pipe, [], 'parse')",
              expected: py.none,
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
import cProfile
import pstats

def label(code):
    return code.upper()

def labels(codes):
    return [label(c) for c in codes]

profiler = cProfile.Profile()
profiler.runcall(labels, ["spo-11681", "hom-22847", "ele-24781"])
for (filename, line, name), values in pstats.Stats(profiler).stats.items():
    if name == "label":
        print(values[1])
`,
        choices: ["3", "1", "4", "0"],
        answer: 0,
        why: "`label` ran once per code: 3 calls. The profiler records each one.",
      },
      {
        id: "q2",
        prompt: "A common mistake: in a profile, `main` has cumtime 4.1 s and tottime 0.01 s, while `load_rates` has tottime 3.6 s. Where is the time going?",
        choices: [
          "Inside load_rates: its own code took 3.6 of the 4.1 seconds",
          "Inside main: it has the largest cumtime",
          "Evenly across both",
          "In the profiler itself",
        ],
        answer: 0,
        why: "`cumtime` of `main` includes everything it called. Its own time is tiny; `load_rates` is where the seconds are actually spent.",
      },
      {
        id: "q3",
        prompt: "A nightly job got slower and you don't know why. What is the best first step?",
        choices: [
          "Profile it on realistic data and sort by cumulative time",
          "Rewrite the loops as comprehensions",
          "Add caching to every function",
          "Time each line with print statements",
        ],
        answer: 0,
        why: "A profile shows where the time actually goes; changes made before that are guesses.",
      },
    ],
    review: [
      "`cProfile.Profile().runcall(func, *args)` records every call; `pstats.Stats` reads them.",
      "ncalls (total/primitive), tottime (own time) and cumtime (including callees).",
      "Call counts are deterministic: a helper called far too often is a strong clue.",
      "Next: when the same call repeats with the same arguments, remember the answer.",
    ],
  },

  // ------------------------------------------------------------------ PY-L37-03 caching
  {
    id: "PY-L37-03",
    version: 2,
    slug: "caching-results",
    title: "Caching: remember results instead of recomputing",
    lede: "When a function is called again with the same arguments and always returns the same result, it can remember the answer. functools.cache and lru_cache do it in one line, and cache_info proves it works.",
    focus: "Cache the results of pure functions with functools, and know when caching is wrong.",
    minutes: 22,
    objectives: [
      "Apply `functools.cache` and `lru_cache(maxsize=…)` and read `cache_info()`",
      "Explain how a bounded cache evicts the least recently used entry",
      "Recognise when caching is unsafe: impure functions, unhashable arguments, stale data",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "comparison", "decorator-at", "decorator-call", "dict-get", "dict-literal", "dict-lookup", "else-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "init-method", "lambda", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "nested-condition", "none-value", "plain-class", "print-call", "print-several", "print-text", "reassignment", "self-name", "string-index", "top-level-indent", "tuple-literal", "tuple-unpack", "unquoted-name"],
    teaches: ["lru-cache"],
    blocks: [
      {
        kind: "text",
        md: "“Recursion trade-offs: depth and repeated work” showed `ways(n)` recomputing the same subproblems exponentially often. If a function's result depends only on its arguments (a **pure** function, the Functional & Dynamic Python module), it can store each result in a dictionary keyed by the arguments and look it up next time. `functools.cache` is a decorator that does exactly that. `func.cache_info()` reports **hits** (answers from the cache), **misses** (real calls) and the current size.",
      },
      {
        kind: "example",
        title: "The staircase, cached",
        code: src`
from functools import cache

calls = {"n": 0}

@cache
def ways(steps):
    calls["n"] += 1
    if steps <= 1:
        return 1
    return ways(steps - 1) + ways(steps - 2)

print(ways(40), calls["n"])
print(ways.cache_info())
print(ways(40), calls["n"], ways.cache_info().hits)
`,
        output: "165580141 41\nCacheInfo(hits=38, misses=41, maxsize=None, currsize=41)\n165580141 41 39\n",
        note: "Each of the 41 values from 0 to 40 is computed once (41 misses); every repeat is a hit. Without the cache, `ways(40)` takes over 300 million calls. Asking again is a single hit.",
      },
      {
        kind: "text",
        md: "`functools.cache` never forgets, which is fine for a small set of arguments but a memory leak for unbounded ones. `lru_cache(maxsize=n)` keeps at most `n` results and, when full, evicts the **least recently used** one, so arguments asked for often stay cached.",
      },
      {
        kind: "example",
        title: "Exchange rates with a two-entry cache",
        code: src`
from functools import lru_cache

fetches = []

@lru_cache(maxsize=2)
def rate(currency):
    fetches.append(currency)
    return {"EUR": 0.92, "GBP": 0.79, "JPY": 151.3}[currency]

for currency in ["EUR", "GBP", "EUR", "JPY", "GBP", "EUR"]:
    rate(currency)
print(fetches)
print(rate.cache_info())
`,
        output: "['EUR', 'GBP', 'JPY', 'GBP', 'EUR']\nCacheInfo(hits=1, misses=5, maxsize=2, currsize=2)\n",
        note: "The second EUR is a hit. JPY then evicts GBP (EUR was used more recently), so GBP is fetched again, which evicts EUR, which is fetched again. A cache too small for the working set saves little.",
      },
      {
        kind: "error-example",
        title: "Arguments must be hashable",
        code: src`
from functools import cache

@cache
def basket_total(prices):
    return sum(prices)

print(basket_total([7.49, 31.0]))
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: unhashable type: 'list'`. The cache is a dictionary keyed by the arguments (“Hash-based problems: sets and dictionaries”), so lists and dicts can't be arguments. Pass a tuple instead.",
      },
      {
        kind: "text",
        md: "**When to use it:** expensive pure functions called repeatedly with the same arguments: recursive computations, parsing the same values, lookups that don't change during a run. **When not to:** functions with side effects (a cached `send_email` sends once), results that depend on something besides the arguments (the clock, a database, a global that changes: the cache keeps returning the stale answer unless you call `cache_clear()`), and arguments that are rarely repeated (the cache only costs memory). Methods are a special case: caching on `self` keeps every object alive (L36), so cache module-level functions or use a per-object dictionary.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Cache a slow parser",
      prompt: "`parse_zone` is pure but slow (it simulates an expensive lookup), and the report calls it for every trip although there are only a few zones. Add `@lru_cache(maxsize=None)` above it and run: the number of real calls drops to the number of distinct zones.",
      spec: [
        ["Function", "`parse_zone(code)` returns the zone name for a code"],
        ["Rule", "each distinct code is parsed only once"],
      ],
      starter: src`
from functools import lru_cache

real_calls = {"n": 0}

def parse_zone(code):
    real_calls["n"] += 1
    names = {"132": "JFK Airport", "138": "LaGuardia Airport", "186": "Penn Station"}
    return names.get(code, "Unknown")

trips = ["132", "186", "132", "138", "132", "186"]
print([parse_zone(code) for code in trips])
print(real_calls["n"])
`,
      answer: src`
from functools import lru_cache

real_calls = {"n": 0}

@lru_cache(maxsize=None)
def parse_zone(code):
    real_calls["n"] += 1
    names = {"132": "JFK Airport", "138": "LaGuardia Airport", "186": "Penn Station"}
    return names.get(code, "Unknown")

trips = ["132", "186", "132", "138", "132", "186"]
print([parse_zone(code) for code in trips])
print(real_calls["n"])
`,
      wrong: [
        {
          code: src`
from functools import lru_cache

real_calls = {"n": 0}

@lru_cache(maxsize=1)
def parse_zone(code):
    real_calls["n"] += 1
    names = {"132": "JFK Airport", "138": "LaGuardia Airport", "186": "Penn Station"}
    return names.get(code, "Unknown")
`,
          fails: ["cached"],
          why: "a cache of one entry is evicted on almost every call, so codes are parsed again",
        },
      ],
      hints: [
        "A decorator goes on the line directly above `def`.",
        "`maxsize=None` means the cache never evicts.",
        "Add the decorator with an unlimited size directly above the function definition.",
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "names",
            label: "parse_zone() still returns the right names",
            show: "parse_zone('132'), parse_zone('999')",
            expr: "result = [parse_zone('132'), parse_zone('999')]",
            expected: py.list(py.str("JFK Airport"), py.str("Unknown")),
          },
          {
            kind: "expr",
            id: "cached",
            label: "each distinct code is parsed once",
            hidden: true,
            expr: "parse_zone.cache_clear()\n_before = real_calls['n']\nfor _c in ['132', '186', '132', '132', '186', '138']:\n    parse_zone(_c)\nresult = real_calls['n'] - _before",
            expected: py.int(3),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Price a bundle once per product",
        prompt: "Product bundles contain products and other bundles, and many bundles share the same sub-bundles. Pricing them naively prices shared sub-bundles over and over. Write `make_pricer(bundles, prices)` that returns a function `price(item)`: a product's price comes from `prices`, a bundle's price is the sum of its parts' prices. Each item must be priced **once**, however often it is shared; use `functools.cache` on an inner function.",
        spec: [
          ["Function", "`make_pricer(bundles, prices)` → a function `price(item)`"],
          ["bundles", "`{bundle_id: [item, …]}` (items may be products or bundles, and may repeat)"],
          ["prices", "`{product_id: price}`"],
          ["Rule", "the checker counts reads of `bundles` and `prices`: each item is looked up once"],
        ],
        starter: src`
def make_pricer(bundles, prices):
    def price(item):
        if item in bundles:
            total = 0
            for part in bundles[item]:
                total += price(part)
            return total
        return prices[item]
    return price

bundles = {"camp-kit": ["tent", "stove-set", "stove-set"], "stove-set": ["stove", "pan"]}
prices = {"tent": 120.0, "stove": 35.5, "pan": 18.0}
print(make_pricer(bundles, prices)("camp-kit"))
`,
        answer: src`
from functools import cache

def make_pricer(bundles, prices):
    @cache
    def price(item):
        if item in bundles:
            total = 0
            for part in bundles[item]:
                total += price(part)
            return total
        return prices[item]
    return price

bundles = {"camp-kit": ["tent", "stove-set", "stove-set"], "stove-set": ["stove", "pan"]}
prices = {"tent": 120.0, "stove": 35.5, "pan": 18.0}
print(make_pricer(bundles, prices)("camp-kit"))
`,
        alternatives: [
          src`
def make_pricer(bundles, prices):
    known = {}

    def price(item):
        if item not in known:
            if item in bundles:
                known[item] = sum(price(part) for part in bundles[item])
            else:
                known[item] = prices[item]
        return known[item]

    return price
`,
        ],
        wrong: [
          {
            code: src`
def make_pricer(bundles, prices):
    def price(item):
        if item in bundles:
            total = 0
            for part in bundles[item]:
                total += price(part)
            return total
        return prices[item]
    return price
`,
            fails: ["lookups"],
            why: "right prices, but every shared sub-bundle is priced again each time it appears",
          },
          {
            code: src`
from functools import lru_cache

def make_pricer(bundles, prices):
    @lru_cache(maxsize=1)
    def price(item):
        if item in bundles:
            total = 0
            for part in bundles[item]:
                total += price(part)
            return total
        return prices[item]
    return price
`,
            fails: ["lookups"],
            why: "a one-entry cache is evicted by every different item, so shared parts are priced again",
          },
        ],
        hints: [
          "The starter is correct, just repetitive: the fix is to remember each item's price.",
          "Put `@cache` on the inner `price` function, so its cache lives inside this pricer.",
          "Because the inner function calls itself by name, the recursive calls go through the cache too.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "prices",
              label: "price() adds up products and bundles",
              show: "camp-kit = tent + 2 × stove-set (stove + pan)",
              expr: "_p = make_pricer({'camp-kit': ['tent', 'stove-set', 'stove-set'], 'stove-set': ['stove', 'pan']}, {'tent': 120.0, 'stove': 35.5, 'pan': 18.0})\nresult = [_p('camp-kit'), _p('stove-set'), _p('tent')]",
              expected: py.list(py.float(227), py.float(53.5), py.float(120)),
            },
            {
              kind: "expr",
              id: "lookups",
              label: "each item is looked up only once, however often it is shared",
              hidden: true,
              expr: [
                "_reads = [0]",
                "class _D(dict):",
                "    def __getitem__(self, k):",
                "        _reads[0] += 1",
                "        return dict.__getitem__(self, k)",
                "_b = _D({f'L{i}': [f'L{i+1}', 'part', f'L{i+1}'] for i in range(14)})",
                "_b['L14'] = ['part']",
                "_pr = _D({'part': 1.0})",
                "_price = make_pricer(_b, _pr)",
                "_total = _price('L0')",
                "result = [_total, _reads[0] <= 20]",
              ].join("\n"),
              expected: py.list(py.float(32767), yes),
            },
            {
              kind: "expr",
              id: "separate",
              label: "two pricers keep separate caches",
              hidden: true,
              expr: "_a = make_pricer({}, {'tent': 120.0})\n_b = make_pricer({}, {'tent': 99.0})\nresult = [_a('tent'), _b('tent')]",
              expected: py.list(py.float(120), py.float(99)),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "A cache whose entries expire",
        prompt: "Exchange rates change during the day, so caching them forever (as `lru_cache` does) serves stale prices. Write a class `ExpiringCache(loader, ttl, clock)`: `get(key)` returns the stored value if it was loaded less than `ttl` seconds ago, and otherwise calls `loader(key)` again. The clock is injected (a function returning seconds), so the checker can control time exactly.",
        spec: [
          ["Class", "`ExpiringCache(loader, ttl, clock)`"],
          ["get(key)", "if `key` was loaded at time `t` and `clock() - t < ttl`, return the stored value; otherwise call `loader(key)`, store it with the current time, and return it"],
          ["loads", "an attribute counting the calls to `loader`"],
        ],
        starter: src`
class ExpiringCache:
    def __init__(self, loader, ttl, clock):
        self.loader = loader
        self.ttl = ttl
        self.clock = clock
        self.loads = 0

    def get(self, key):
        self.loads += 1
        return self.loader(key)

now = {"t": 0}
cache = ExpiringCache(lambda currency: {"EUR": 0.92}[currency], ttl=60, clock=lambda: now["t"])
cache.get("EUR")
now["t"] = 30
cache.get("EUR")
now["t"] = 90
cache.get("EUR")
print(cache.loads)
`,
        answer: src`
class ExpiringCache:
    def __init__(self, loader, ttl, clock):
        self.loader = loader
        self.ttl = ttl
        self.clock = clock
        self.loads = 0
        self.entries = {}

    def get(self, key):
        now = self.clock()
        if key in self.entries:
            value, loaded_at = self.entries[key]
            if now - loaded_at < self.ttl:
                return value
        value = self.loader(key)
        self.loads += 1
        self.entries[key] = (value, now)
        return value

now = {"t": 0}
cache = ExpiringCache(lambda currency: {"EUR": 0.92}[currency], ttl=60, clock=lambda: now["t"])
cache.get("EUR")
now["t"] = 30
cache.get("EUR")
now["t"] = 90
cache.get("EUR")
print(cache.loads)
`,
        alternatives: [
          src`
class ExpiringCache:
    def __init__(self, loader, ttl, clock):
        self.loader, self.ttl, self.clock = loader, ttl, clock
        self.loads = 0
        self._values = {}
        self._times = {}

    def get(self, key):
        t = self.clock()
        if key not in self._times or t - self._times[key] >= self.ttl:
            self._values[key] = self.loader(key)
            self._times[key] = t
            self.loads += 1
        return self._values[key]
`,
        ],
        wrong: [
          {
            code: src`
class ExpiringCache:
    def __init__(self, loader, ttl, clock):
        self.loader = loader
        self.ttl = ttl
        self.clock = clock
        self.loads = 0
        self.entries = {}

    def get(self, key):
        if key not in self.entries:
            self.entries[key] = self.loader(key)
            self.loads += 1
        return self.entries[key]
`,
            fails: ["expires", "boundary"],
            why: "entries never expire, so the stale rate is served forever",
          },
          {
            code: src`
class ExpiringCache:
    def __init__(self, loader, ttl, clock):
        self.loader = loader
        self.ttl = ttl
        self.clock = clock
        self.loads = 0
        self.entries = {}

    def get(self, key):
        now = self.clock()
        if key in self.entries:
            value, loaded_at = self.entries[key]
            if now - loaded_at <= self.ttl:
                return value
        value = self.loader(key)
        self.loads += 1
        self.entries[key] = (value, now)
        return value
`,
            fails: ["boundary"],
            why: "an entry exactly `ttl` seconds old is still served, one tick too long",
          },
        ],
        hints: [
          "Store each value together with the time it was loaded.",
          "Read the clock once per `get`; an entry is fresh while its age is less than `ttl`.",
          "On a miss or an expired entry, load, count, store the value with the current time, and return it.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "fresh",
              label: "a fresh entry is served without loading again",
              show: "get at t=0 and t=30 with ttl=60",
              expr: "_t = [0]\n_c = ExpiringCache(lambda k: k.lower(), 60, lambda: _t[0])\n_a = _c.get('EUR')\n_t[0] = 30\n_b = _c.get('EUR')\nresult = [_a, _b, _c.loads]",
              expected: py.list(py.str("eur"), py.str("eur"), py.int(1)),
            },
            {
              kind: "expr",
              id: "expires",
              label: "an old entry is loaded again",
              show: "get at t=0, 30 and 90 with ttl=60",
              expr: "_t = [0]\n_seq = iter([0.92, 0.93])\n_c = ExpiringCache(lambda k: next(_seq), 60, lambda: _t[0])\n_c.get('EUR')\n_t[0] = 30\n_c.get('EUR')\n_t[0] = 90\nresult = [_c.get('EUR'), _c.loads]",
              expected: py.list(py.float(0.93), py.int(2)),
            },
            {
              kind: "expr",
              id: "boundary",
              label: "an entry exactly ttl seconds old has expired",
              hidden: true,
              expr: "_t = [100]\n_c = ExpiringCache(lambda k: k, 10, lambda: _t[0])\n_c.get('GBP')\n_t[0] = 110\n_c.get('GBP')\nresult = _c.loads",
              expected: py.int(2),
            },
            {
              kind: "expr",
              id: "keys",
              label: "different keys are cached separately",
              hidden: true,
              expr: "_t = [0]\n_c = ExpiringCache(lambda k: k * 2, 5, lambda: _t[0])\nresult = [_c.get('a'), _c.get('b'), _c.get('a'), _c.loads]",
              expected: py.list(py.str("aa"), py.str("bb"), py.str("aa"), py.int(2)),
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
from functools import lru_cache

@lru_cache(maxsize=None)
def tax(region):
    return {"TX": 0.0825, "CA": 0.0725}[region]

for region in ["TX", "CA", "TX", "TX"]:
    tax(region)
info = tax.cache_info()
print(info.hits, info.misses)
`,
        choices: ["2 2", "3 1", "1 3", "4 0"],
        answer: 0,
        why: "TX and CA are each computed once (2 misses); the two later TX calls are hits.",
      },
      {
        id: "q2",
        prompt: "A common mistake: caching a function whose result depends on something that changes. What does this print?",
        program: src`
from functools import cache

stock = {"SPO-11681": 4}

@cache
def in_stock(sku):
    return stock[sku] > 0

print(in_stock("SPO-11681"))
stock["SPO-11681"] = 0
print(in_stock("SPO-11681"))
`,
        choices: ["True\nTrue", "True\nFalse", "False\nFalse", "True\nKeyError"],
        answer: 0,
        why: "The second call is a cache hit: the cached `True` is returned without looking at the changed stock. Only pure functions are safe to cache (or call `in_stock.cache_clear()` when the data changes).",
      },
      {
        id: "q3",
        prompt: "Which function is a good candidate for `@cache`?",
        choices: [
          "Converting a postcode to its region, which never changes during the run",
          "Sending a receipt email for an order",
          "Reading the current time",
          "Fetching the latest stock level from a database",
        ],
        answer: 0,
        why: "A pure, repeated lookup is ideal. Sending email has a side effect, and the clock and stock levels change, so caching them returns wrong answers.",
      },
    ],
    review: [
      "`@cache` and `@lru_cache(maxsize=n)` remember results keyed by the (hashable) arguments.",
      "`cache_info()` shows hits, misses and size; a bounded cache evicts the least recently used entry.",
      "Cache only pure functions; for data that changes, use expiry or `cache_clear()`.",
      "Next: making file input and output efficient.",
    ],
  },

  // ------------------------------------------------------------------ PY-L37-04 efficient I/O
  {
    id: "PY-L37-04",
    version: 2,
    slug: "efficient-io",
    title: "Efficient I/O: stream, open once, write in batches",
    lede: "Files are slow and can be huge. Reading line by line keeps memory flat whatever the size, and opening a file once and writing in batches avoids paying the cost of the disk again and again.",
    focus: "Stream large files line by line and keep file handles open for the whole job.",
    minutes: 22,
    objectives: [
      "Compare the peak memory of reading a whole file with streaming it, using tracemalloc",
      "Keep only what is needed while streaming (counts, a deque of recent lines)",
      "Open each output file once and write in batches",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "comparison", "deque-call", "dict-iterate", "dict-literal", "dict-lookup", "encoding-arg", "file-open", "finally-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-condition", "newline-escape", "path-call", "print-call", "print-several", "print-text", "range-call", "reassignment", "string-format", "string-index", "string-method", "string-slice", "string-split", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "with-statement"],
    teaches: ["stream-io"],
    blocks: [
      {
        kind: "text",
        md: "`f.read()` and `f.readlines()` put the **whole** file in memory, plus a list of every line. Iterating `for line in f` (see Files & Directories) reads a buffer-full at a time and hands out one line at a time, so memory stays at about the size of the buffer, whether the file is 1 MB or 10 GB. The example writes a 50,000-line pickup file and measures both ways with tracemalloc (“Measuring memory: getsizeof, tracemalloc snapshots and __slots__”).",
      },
      {
        kind: "example",
        title: "The same count, two memory profiles",
        code: src`
import tracemalloc

with open("pickups.csv", "w", encoding="utf-8") as f:
    f.write("trip_id,zone\n")
    for i in range(50000):
        f.write(f"{16126 + i},{i % 263}\n")

def peak(work):
    tracemalloc.start()
    result = work()
    current, top = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    return result, top

def count_whole():
    with open("pickups.csv", encoding="utf-8") as f:
        lines = f.read().splitlines()
    return sum(1 for line in lines[1:] if line.endswith(",132"))

def count_streaming():
    count = 0
    with open("pickups.csv", encoding="utf-8") as f:
        next(f)
        for line in f:
            if line.rstrip("\n").endswith(",132"):
                count += 1
    return count

(a, whole), (b, stream) = peak(count_whole), peak(count_streaming)
print(a, b, whole > 10 * stream)
`,
        output: "190 190 True\n",
        note: "Both count the 190 pickups in zone 132 (JFK). Reading the whole file peaked at megabytes; streaming stayed around the size of the read buffer. Double the file and the first number doubles while the second stays put. `next(f)` skips the header line.",
      },
      {
        kind: "text",
        md: "Writing has its own trap. Opening a file is expensive (the operating system checks permissions, finds the file, sets up buffers), and every `open` in a loop pays it again, while every `write` on an open file goes into a buffer that is flushed in large blocks. So: **open once, write many times**, or build a batch and write it with one call (`f.write(\"\".join(lines))` or `f.writelines(lines)`). The example counts the calls with a small wrapper.",
      },
      {
        kind: "example",
        title: "Opening per line against opening once",
        code: src`
opens = {"count": 0}

def counted_open(path, mode):
    opens["count"] += 1
    return open(path, mode, encoding="utf-8")

events = [f"order {n} shipped\n" for n in range(1000)]

for event in events:
    with counted_open("per_line.log", "a") as log:
        log.write(event)
per_line = opens["count"]

opens["count"] = 0
with counted_open("once.log", "w") as log:
    log.writelines(events)

with open("per_line.log", encoding="utf-8") as a, open("once.log", encoding="utf-8") as b:
    print(a.read() == b.read())
print(per_line, opens["count"])
`,
        output: "True\n1000 1\n",
        note: "Same file contents, 1,000 opens against 1. On a real disk (and on network drives especially) each open costs far more than a buffered write. `with ... as a, ... as b` opens two files in one `with`.",
      },
      {
        kind: "text",
        md: "**When to use it:** stream every file that could grow (logs, exports, sensor data); keep only aggregates or a bounded window (`collections.deque(maxlen=n)`, the Collections & Itertools module) while reading. Keep output files open for the whole job, or collect a batch and write it at once. **Mistakes to avoid:** `read()`/`readlines()` on files of unknown size; building a list of all rows when you only need a total; opening a file inside a loop; and forgetting `with`, which leaves files open (and unflushed) after an error.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count errors without loading the log",
      prompt: "`count_errors` reads the whole log into memory before counting. Change it to stream the file line by line (no `read`, no `readlines`) and run it: same count, flat memory. The hidden check measures the peak on a 60,000-line log.",
      spec: [
        ["Function", "`count_errors(path)`"],
        ["Returns", "how many lines contain `\"ERROR\"`"],
      ],
      starter: src`
def count_errors(path):
    with open(path, encoding="utf-8") as f:
        lines = f.readlines()
    count = 0
    for line in lines:
        if "ERROR" in line:
            count += 1
    return count

with open("app.log", "w", encoding="utf-8") as f:
    f.write("INFO start\nERROR payment declined\nINFO retry\nERROR payment declined\n")
print(count_errors("app.log"))
`,
      answer: src`
def count_errors(path):
    count = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            if "ERROR" in line:
                count += 1
    return count

with open("app.log", "w", encoding="utf-8") as f:
    f.write("INFO start\nERROR payment declined\nINFO retry\nERROR payment declined\n")
print(count_errors("app.log"))
`,
      wrong: [
        {
          code: src`
def count_errors(path):
    with open(path, encoding="utf-8") as f:
        return f.read().count("ERROR")
`,
          fails: ["peak"],
          why: "the count is right here, but `read()` holds the whole log in memory",
        },
      ],
      hints: [
        "A file object is iterable: `for line in f` reads it one line at a time.",
        "Count inside that loop, while the file is still open.",
        "Remove the `readlines()` call entirely.",
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "count",
            label: "count_errors() counts the error lines",
            show: "a 4-line log with 2 errors",
            expr: "with open('t.log', 'w', encoding='utf-8') as _f:\n    _f.write('INFO a\\nERROR b\\nERROR c\\nINFO d\\n')\nresult = count_errors('t.log')",
            expected: py.int(2),
          },
          {
            kind: "expr",
            id: "peak",
            label: "count_errors() keeps its peak memory under 1 MB on a 60,000-line log (about 2 MB of text)",
            hidden: true,
            expr: "import tracemalloc as _tm\nwith open('big.log', 'w', encoding='utf-8') as _f:\n    for _i in range(60000):\n        _f.write(('ERROR' if _i % 3 == 0 else 'INFO') + f' request {_i} handled by worker\\n')\n_tm.start()\n_n = count_errors('big.log')\n_cur, _peak = _tm.get_traced_memory()\n_tm.stop()\nresult = [_n, _peak < 1000000]",
            expected: py.list(py.int(20000), yes),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "The last errors in a huge log",
        prompt: "When a service crashes, the on-call engineer wants the **last** `n` error lines of a log that may be gigabytes long. Write `last_errors(path, n)` that streams the file and keeps only the most recent `n` error lines as it goes (a `deque` with `maxlen` does the dropping for you). Lines are returned without their newline.",
        spec: [
          ["Function", "`last_errors(path, n)`"],
          ["Returns", "a list of the last `n` lines containing `\"ERROR\"`, oldest first, without the trailing newline; fewer if there aren't `n`"],
          ["Constraint", "peak memory stays small on a 60,000-line file"],
        ],
        starter: src`
def last_errors(path, n):
    return []

with open("api.log", "w", encoding="utf-8") as f:
    f.write("INFO boot\nERROR timeout /orders\nINFO ok\nERROR 500 /payments\nERROR timeout /orders\n")
print(last_errors("api.log", 2))
`,
        answer: src`
from collections import deque

def last_errors(path, n):
    recent = deque(maxlen=n)
    with open(path, encoding="utf-8") as f:
        for line in f:
            if "ERROR" in line:
                recent.append(line.rstrip("\n"))
    return list(recent)

with open("api.log", "w", encoding="utf-8") as f:
    f.write("INFO boot\nERROR timeout /orders\nINFO ok\nERROR 500 /payments\nERROR timeout /orders\n")
print(last_errors("api.log", 2))
`,
        alternatives: [
          src`
def last_errors(path, n):
    kept = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            if "ERROR" in line:
                kept.append(line.rstrip("\n"))
                if len(kept) > n:
                    kept.pop(0)
    return kept
`,
        ],
        wrong: [
          {
            code: src`
def last_errors(path, n):
    with open(path, encoding="utf-8") as f:
        errors = [line.rstrip("\n") for line in f if "ERROR" in line]
    return errors[-n:]
`,
            fails: ["peak"],
            why: "right lines, but every error line in the file is kept until the end",
          },
          {
            code: src`
from collections import deque

def last_errors(path, n):
    recent = deque(maxlen=n)
    with open(path, encoding="utf-8") as f:
        for line in f:
            if "ERROR" in line:
                recent.append(line)
    return list(recent)
`,
            fails: ["lines", "peak"],
            why: "the lines keep their trailing newline",
          },
        ],
        hints: [
          "`deque(maxlen=n)` drops its oldest item automatically when a new one arrives and it is full.",
          "Stream the file with `for line in f` and append only error lines.",
          "Strip the newline before storing, and return a list at the end.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "lines",
              label: "last_errors() returns the last n error lines, oldest first",
              show: "the starter's log with n=2, and n=5",
              expr: "with open('a.log', 'w', encoding='utf-8') as _f:\n    _f.write('INFO boot\\nERROR timeout /orders\\nINFO ok\\nERROR 500 /payments\\nERROR timeout /orders\\n')\nresult = [last_errors('a.log', 2), last_errors('a.log', 5)]",
              expected: py.list(py.list(py.str("ERROR 500 /payments"), py.str("ERROR timeout /orders")), py.list(py.str("ERROR timeout /orders"), py.str("ERROR 500 /payments"), py.str("ERROR timeout /orders"))),
            },
            {
              kind: "expr",
              id: "none",
              label: "a log without errors gives an empty list",
              hidden: true,
              expr: "with open('b.log', 'w', encoding='utf-8') as _f:\n    _f.write('INFO a\\nINFO b\\n')\nresult = last_errors('b.log', 3)",
              expected: py.list(),
            },
            {
              kind: "expr",
              id: "peak",
              label: "memory stays under 1 MB on a 60,000-line log (about 2 MB of text)",
              hidden: true,
              expr: "import tracemalloc as _tm\nwith open('c.log', 'w', encoding='utf-8') as _f:\n    for _i in range(60000):\n        _f.write(f'ERROR request {_i} failed upstream\\n')\n_tm.start()\n_last = last_errors('c.log', 3)\n_cur, _peak = _tm.get_traced_memory()\n_tm.stop()\nresult = [_last, _peak < 1000000]",
              expected: py.list(py.list(py.str("ERROR request 59997 failed upstream"), py.str("ERROR request 59998 failed upstream"), py.str("ERROR request 59999 failed upstream")), yes),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Split trips into one file per day",
        prompt: "Write `split_by_day(source, folder)`: stream a CSV of trips (`trip_id,pickup_date`, header first) and write each trip line to `<folder>/<date>.csv`, each with its own header line. Open each output file **once** for the whole job (keep the open files in a dictionary and close them all at the end), not once per line. The checker counts `open()` calls.",
        spec: [
          ["Function", "`split_by_day(source, folder)`"],
          ["Output", "one file per date, named `<date>.csv`, containing the header `trip_id,pickup_date` and then that date's lines in their original order"],
          ["Returns", "a sorted list of the dates written"],
          ["Constraint", "`open()` is called once for the source and once per date"],
        ],
        starter: src`
import os

def split_by_day(source, folder):
    return []

with open("trips.csv", "w", encoding="utf-8") as f:
    f.write("trip_id,pickup_date\n16126,2025-01-15\n16127,2025-01-15\n16340,2025-01-16\n")
os.makedirs("days", exist_ok=True)
print(split_by_day("trips.csv", "days"))
`,
        answer: src`
import os

def split_by_day(source, folder):
    outputs = {}
    try:
        with open(source, encoding="utf-8") as f:
            header = next(f)
            for line in f:
                day = line.rstrip("\n").split(",")[1]
                if day not in outputs:
                    outputs[day] = open(os.path.join(folder, day + ".csv"), "w", encoding="utf-8")
                    outputs[day].write(header)
                outputs[day].write(line)
    finally:
        for out in outputs.values():
            out.close()
    return sorted(outputs)

with open("trips.csv", "w", encoding="utf-8") as f:
    f.write("trip_id,pickup_date\n16126,2025-01-15\n16127,2025-01-15\n16340,2025-01-16\n")
os.makedirs("days", exist_ok=True)
print(split_by_day("trips.csv", "days"))
`,
        alternatives: [
          src`
from contextlib import ExitStack
from pathlib import Path

def split_by_day(source, folder):
    files = {}
    with ExitStack() as stack:
        src = stack.enter_context(open(source, encoding="utf-8"))
        header = src.readline()
        for line in src:
            day = line.strip().split(",")[1]
            if day not in files:
                files[day] = stack.enter_context(open(Path(folder) / f"{day}.csv", "w", encoding="utf-8"))
                files[day].write(header)
            files[day].write(line)
    return sorted(files)
`,
        ],
        wrong: [
          {
            code: src`
import os

def split_by_day(source, folder):
    days = []
    with open(source, encoding="utf-8") as f:
        header = next(f)
        for line in f:
            day = line.rstrip("\n").split(",")[1]
            path = os.path.join(folder, day + ".csv")
            if day not in days:
                days.append(day)
                with open(path, "w", encoding="utf-8") as out:
                    out.write(header)
            with open(path, "a", encoding="utf-8") as out:
                out.write(line)
    return sorted(days)
`,
            fails: ["opens"],
            why: "the files are right, but every line opens its output file again",
          },
          {
            code: src`
import os

def split_by_day(source, folder):
    outputs = {}
    with open(source, encoding="utf-8") as f:
        next(f)
        for line in f:
            day = line.rstrip("\n").split(",")[1]
            if day not in outputs:
                outputs[day] = open(os.path.join(folder, day + ".csv"), "w", encoding="utf-8")
            outputs[day].write(line)
    for out in outputs.values():
        out.close()
    return sorted(outputs)
`,
            fails: ["files"],
            why: "the output files are missing their header line",
          },
        ],
        hints: [
          "Read the source's header first (`next(f)`), then stream the remaining lines.",
          "Keep a dictionary from date to an open output file; open (and write the header) only the first time a date appears.",
          "Close every output file at the end, even after an error (`try`/`finally`, or `contextlib.ExitStack`).",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "files",
              label: "split_by_day() writes one file per date with a header",
              show: "three trips over two days",
              expr: "import os as _os\nwith open('t.csv', 'w', encoding='utf-8') as _f:\n    _f.write('trip_id,pickup_date\\n16126,2025-01-15\\n16340,2025-01-16\\n16127,2025-01-15\\n')\n_os.makedirs('out1', exist_ok=True)\n_days = split_by_day('t.csv', 'out1')\nwith open('out1/2025-01-15.csv', encoding='utf-8') as _f:\n    _a = _f.read()\nwith open('out1/2025-01-16.csv', encoding='utf-8') as _f:\n    _b = _f.read()\nresult = [_days, _a, _b]",
              expected: py.list(py.list(py.str("2025-01-15"), py.str("2025-01-16")), py.str("trip_id,pickup_date\n16126,2025-01-15\n16127,2025-01-15\n"), py.str("trip_id,pickup_date\n16340,2025-01-16\n")),
            },
            {
              kind: "expr",
              id: "opens",
              label: "each file is opened once",
              hidden: true,
              expr: countOpens(
                "import os as _os\nwith open('u.csv', 'w', encoding='utf-8') as _f:\n    _f.write('trip_id,pickup_date\\n')\n    for _i in range(300):\n        _f.write(f'{_i},2025-01-{10 + _i % 3}\\n')\n_os.makedirs('out2', exist_ok=True)",
                "_days = split_by_day('u.csv', 'out2')",
                "result = [_days, _opens[0]]",
              ),
              expected: py.list(py.list(py.str("2025-01-10"), py.str("2025-01-11"), py.str("2025-01-12")), py.int(4)),
            },
            {
              kind: "expr",
              id: "empty",
              label: "a file with only a header writes nothing",
              hidden: true,
              expr: "import os as _os\nwith open('v.csv', 'w', encoding='utf-8') as _f:\n    _f.write('trip_id,pickup_date\\n')\n_os.makedirs('out3', exist_ok=True)\nresult = [split_by_day('v.csv', 'out3'), _os.listdir('out3')]",
              expected: py.list(py.list(), py.list()),
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
from collections import deque

recent = deque(maxlen=2)
for line in ["INFO a", "ERROR b", "ERROR c", "INFO d", "ERROR e"]:
    if line.startswith("ERROR"):
        recent.append(line)
print(list(recent))
`,
        choices: ["['ERROR c', 'ERROR e']", "['ERROR b', 'ERROR c']", "['ERROR b', 'ERROR c', 'ERROR e']", "['ERROR e']"],
        answer: 0,
        why: "A deque with `maxlen=2` drops its oldest item when a third is added, so only the last two error lines remain.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `rows = open(path).readlines()` on a 6 GB export. What happens?",
        choices: [
          "Every line is read into one list, so the program needs gigabytes of memory (and the file isn't closed by a with)",
          "Python reads it lazily, one line at a time",
          "readlines() only reads the first 1,000 lines",
          "It is the fastest way to process a large file",
        ],
        answer: 0,
        why: "`readlines()` builds a list of every line. Iterate the open file inside `with` instead.",
      },
      {
        id: "q3",
        prompt: "An export writes 200,000 rows by opening the output file, appending one row and closing it, for each row. What is the better design?",
        choices: [
          "Open the file once with `with`, write every row (or batches of rows), and let `with` close it",
          "Open the file in binary mode for each row",
          "Sleep between writes so the disk can catch up",
          "Write all rows into separate files",
        ],
        answer: 0,
        why: "Each open/close pays the operating system's setup and flush cost. One open with buffered writes pays it once.",
      },
    ],
    review: [
      "`for line in f` streams a file in buffer-sized pieces: memory stays flat at any file size.",
      "Keep only what you need while streaming: totals, or `deque(maxlen=n)` for the last n items.",
      "Open each output once (or write a batch at once) and close everything with `with` or `finally`.",
      "Next: the biggest wins of all, changing the algorithm, and proving the result is unchanged.",
    ],
  },

  // ------------------------------------------------------------------ PY-L37-05 algorithmic optimization
  {
    id: "PY-L37-05",
    version: 2,
    slug: "optimise-the-algorithm",
    title: "Algorithmic optimization: change the work, not the details",
    lede: "No amount of micro-tuning makes a quadratic loop fast. Profiling points at the hot spot; an index, a sort or moving work out of a loop changes how the work grows; a comparison of old and new results proves nothing broke.",
    focus: "Replace repeated work with an index, a single sort or hoisted computation, and prove the result is unchanged.",
    minutes: 24,
    objectives: [
      "Spot repeated scans and repeated setup work inside loops",
      "Replace them with a dictionary or set built once, a single sort, or work moved out of the loop",
      "Prove an optimisation by checking equal results and counting the operations saved",
    ],
    requires: ["arithmetic", "assignment", "boolean", "break-statement", "comp-if", "comparison", "defaultdict-call", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-loop", "none-value", "precedence", "print-call", "print-several", "print-text", "range-call", "reassignment", "set-comp", "set-literal", "sort-key", "string-format", "string-index", "string-slice", "top-level-indent"],
    teaches: ["fast-lookup"],
    blocks: [
      {
        kind: "text",
        md: "The previous lessons gave you the tools: Big O to reason (see Algorithms & Complexity), cProfile to find the hot spot, timeit to measure. The usual fixes, in order of how much they gain:\n\n1. **Build an index once** instead of scanning inside a loop (O(n·m) → O(n + m)).\n2. **Sort once** and walk or bisect, instead of searching repeatedly.\n3. **Hoist** work that doesn't change out of the loop: building a set, compiling a pattern, computing a constant.\n\nEvery optimisation must keep the results identical. Keep the old version, run both on the same data, and compare.",
      },
      {
        kind: "example",
        title: "Matching payments to orders: scan against index",
        code: src`
def unpaid_slow(orders, payments):
    unpaid = []
    for order in orders:
        paid = False
        for payment in payments:
            if payment["order_id"] == order["order_id"]:
                paid = True
        if not paid:
            unpaid.append(order["order_id"])
    return unpaid

def unpaid_fast(orders, payments):
    paid_ids = {payment["order_id"] for payment in payments}
    return [order["order_id"] for order in orders if order["order_id"] not in paid_ids]

orders = [{"order_id": f"O{100000 + n}"} for n in range(3000)]
payments = [{"order_id": f"O{100000 + n}"} for n in range(0, 3000, 2)]
print(unpaid_slow(orders, payments) == unpaid_fast(orders, payments))
print(len(unpaid_fast(orders, payments)))
print(len(orders) * len(payments), len(orders) + len(payments))
`,
        output: "True\n1500\n4500000 4500\n",
        note: "Same answer, and the last line shows the work: the slow version makes 4.5 million comparisons, the fast one about 4,500 set operations. That is a thousand times less work, and the gap widens as the data grows.",
      },
      {
        kind: "text",
        md: "Hoisting is the second common fix. A loop that rebuilds the same set, list or pattern on every pass multiplies its cost by the number of passes, even though the result never changes.",
      },
      {
        kind: "example",
        title: "Work that doesn't belong inside the loop",
        code: src`
import re

holidays = ["2025-01-01", "2025-01-20", "2025-02-17", "2025-05-26"]
deliveries = [("O1", "2025-01-20"), ("O2", "2025-01-21"), ("O3", "2025-05-26"), ("O4", "bad-date")]

def flagged_slow(deliveries):
    flagged = []
    for order_id, day in deliveries:
        valid = re.compile(r"\d{4}-\d{2}-\d{2}")
        closed = set(holidays)
        if valid.fullmatch(day) and day in closed:
            flagged.append(order_id)
    return flagged

def flagged_fast(deliveries):
    valid = re.compile(r"\d{4}-\d{2}-\d{2}")
    closed = set(holidays)
    flagged = []
    for order_id, day in deliveries:
        if valid.fullmatch(day) and day in closed:
            flagged.append(order_id)
    return flagged

print(flagged_slow(deliveries), flagged_fast(deliveries))
`,
        output: "['O1', 'O3'] ['O1', 'O3']\n",
        note: "Inside the loop, the slow version rebuilds the holiday set (O(h) each time) and asks `re` for the pattern again on every delivery. Building both once, before the loop, gives the same flags for a fraction of the work.",
      },
      {
        kind: "text",
        md: "**When to optimise:** when a profile shows a real hot spot on realistic data, and the code is too slow for its job. **How to prove it:** equal results on the same inputs (including edge cases), then fewer operations or a better timing ratio. **Mistakes to avoid:** optimising code that isn't hot; changing behaviour by accident (order of results, duplicates, ties); and trading a clear O(n) loop for clever code that is no faster.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Hoist the set out of the loop",
      prompt: "`blocked_orders` rebuilds a set of blocked customers for every order. Move that line above the loop, and run it: same answer, one set built instead of one per order.",
      spec: [
        ["Function", "`blocked_orders(orders, blocked_customers)`"],
        ["Returns", "the `order_id` of each order whose `customer_id` is blocked, in order"],
      ],
      starter: src`
def blocked_orders(orders, blocked_customers):
    found = []
    for order in orders:
        blocked = set(blocked_customers)
        if order["customer_id"] in blocked:
            found.append(order["order_id"])
    return found

orders = [{"order_id": "O100282", "customer_id": "C00077"}, {"order_id": "O100376", "customer_id": "C00065"}]
print(blocked_orders(orders, ["C00065", "C09999"]))
`,
      answer: src`
def blocked_orders(orders, blocked_customers):
    blocked = set(blocked_customers)
    found = []
    for order in orders:
        if order["customer_id"] in blocked:
            found.append(order["order_id"])
    return found

orders = [{"order_id": "O100282", "customer_id": "C00077"}, {"order_id": "O100376", "customer_id": "C00065"}]
print(blocked_orders(orders, ["C00065", "C09999"]))
`,
      wrong: [
        {
          code: src`
def blocked_orders(orders, blocked_customers):
    found = []
    for order in orders:
        if order["customer_id"] in blocked_customers:
            found.append(order["order_id"])
    return found
`,
          fails: ["reads"],
          why: "no set at all: every order scans the whole blocked list",
        },
      ],
      hints: [
        "The set is the same on every pass of the loop.",
        "Build it once, before the loop starts.",
        "Move the `set(...)` line up above `for`.",
      ],
      task: {
        checks: [
          fn("returns", "blocked_orders", [
            example([[{ order_id: "O100282", customer_id: "C00077" }, { order_id: "O100376", customer_id: "C00065" }], ["C00065", "C09999"]], ["O100376"]),
            hiddenCase("no blocked customers", [[{ order_id: "O1", customer_id: "C1" }], []], []),
          ], { label: "blocked_orders() finds the blocked customers' orders" }),
          {
            kind: "expr",
            id: "reads",
            label: "the blocked list is read once, not once per order",
            hidden: true,
            expr: workBudget("[_Code(f'C{i}') for i in range(500)]", "blocked_orders([{'order_id': str(i), 'customer_id': f'C{i}'} for i in range(400)], _data)", 1500),
            expected: yes,
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Deliveries on a holiday, fast",
        prompt: "A courier flags deliveries scheduled on public holidays. The current version (the starter) checks each delivery against the holiday **list**, and with a year of deliveries the job takes minutes. Rewrite `holiday_deliveries(deliveries, holidays)` so each delivery is checked in one step, with exactly the same results.",
        spec: [
          ["Function", "`holiday_deliveries(deliveries, holidays)`"],
          ["deliveries", "a list of `[order_id, date]` pairs"],
          ["Returns", "the order IDs whose date is in `holidays`, in delivery order (repeats kept)"],
          ["Constraint", "at most 3,000 reads of the holiday list plus date comparisons, for 1,000 deliveries and 1,000 holidays"],
        ],
        starter: src`
def holiday_deliveries(deliveries, holidays):
    flagged = []
    for order_id, date in deliveries:
        if date in holidays:
            flagged.append(order_id)
    return flagged

holidays = ["2025-01-01", "2025-01-20", "2025-05-26"]
print(holiday_deliveries([["O1", "2025-01-20"], ["O2", "2025-01-21"], ["O3", "2025-05-26"]], holidays))
`,
        answer: src`
def holiday_deliveries(deliveries, holidays):
    closed = set(holidays)
    flagged = []
    for order_id, date in deliveries:
        if date in closed:
            flagged.append(order_id)
    return flagged

holidays = ["2025-01-01", "2025-01-20", "2025-05-26"]
print(holiday_deliveries([["O1", "2025-01-20"], ["O2", "2025-01-21"], ["O3", "2025-05-26"]], holidays))
`,
        alternatives: [
          src`
def holiday_deliveries(deliveries, holidays):
    closed = {day: True for day in holidays}
    return [order_id for order_id, date in deliveries if date in closed]
`,
        ],
        wrong: [
          {
            code: src`
def holiday_deliveries(deliveries, holidays):
    flagged = []
    for order_id, date in deliveries:
        if date in set(holidays):
            flagged.append(order_id)
    return flagged
`,
            fails: ["comparisons"],
            why: "the set is rebuilt for every delivery, so the holiday list is still processed once per delivery",
          },
          {
            code: src`
def holiday_deliveries(deliveries, holidays):
    closed = set(holidays)
    flagged = []
    for order_id, date in deliveries:
        if date in closed and order_id not in flagged:
            flagged.append(order_id)
    return flagged
`,
            fails: ["returns"],
            why: "dropping repeated order IDs changes the results: an optimisation must not change behaviour",
          },
        ],
        hints: [
          "The starter is correct; only its `in holidays` is slow, because `holidays` is a list.",
          "Convert the holidays once, before the loop, into something that answers `in` by hashing.",
          "Keep everything else exactly as it was, so the results don't change.",
        ],
        task: {
          checks: [
            fn("returns", "holiday_deliveries", [
              example([[["O1", "2025-01-20"], ["O2", "2025-01-21"], ["O3", "2025-05-26"]], ["2025-01-01", "2025-01-20", "2025-05-26"]], ["O1", "O3"]),
              example([[], ["2025-01-01"]], []),
              example([[["O9", "2025-07-04"]], []], []),
              hiddenCase("the same order listed twice", [[["O1", "2025-01-01"], ["O1", "2025-01-01"]], ["2025-01-01"]], ["O1", "O1"]),
              hiddenCase("dates in another format don't match", [[["O1", "01/01/2025"]], ["2025-01-01"]], []),
            ], { label: "holiday_deliveries() gives exactly the original results" }),
            {
              kind: "expr",
              id: "comparisons",
              label: "at most 3,000 reads and comparisons for 1,000 deliveries and 1,000 holidays",
              hidden: true,
              expr: workBudget("[_Code(f'2025-{i:04}') for i in range(1000)]", "holiday_deliveries([[str(i), _Code(f'2025-{i + 500:04}')] for i in range(1000)], _data)", 3000),
              expected: yes,
            },
          ],
        },
      },
      {
        id: "c2",
        title: "The top customers without repeated scans",
        prompt: "A dashboard shows the `k` customers who spent the most. The starter finds the biggest spender, removes it, and scans again, `k` times, after totalling the spend again on every pass. Rewrite `top_customers(orders, k)` to total each customer's spend in one pass and sort once, with the same results (ties go to the customer ID that sorts first).",
        spec: [
          ["Function", "`top_customers(orders, k)`"],
          ["orders", "a list of `{\"customer_id\": ..., \"total\": ...}` dictionaries"],
          ["Returns", "a list of up to `k` `(customer_id, spend)` tuples, highest spend first; equal spend → smaller customer ID first"],
          ["Constraint", "the order list is read about once: at most 2 × len(orders) reads for k = 20"],
        ],
        starter: src`
def top_customers(orders, k):
    result = []
    for _ in range(k):
        spend = {}
        for order in orders:
            customer = order["customer_id"]
            spend[customer] = spend.get(customer, 0) + order["total"]
        for customer, _total in result:
            del spend[customer]
        if not spend:
            break
        best = None
        for customer in sorted(spend):
            if best is None or spend[customer] > spend[best]:
                best = customer
        result.append((best, spend[best]))
    return result

orders = [
    {"customer_id": "C00077", "total": 35.84},
    {"customer_id": "C00065", "total": 91.47},
    {"customer_id": "C00077", "total": 246.6},
    {"customer_id": "C01338", "total": 55.72},
]
print(top_customers(orders, 2))
`,
        answer: src`
def top_customers(orders, k):
    spend = {}
    for order in orders:
        customer = order["customer_id"]
        if customer not in spend:
            spend[customer] = 0
        spend[customer] += order["total"]
    ranked = sorted(spend.items(), key=lambda pair: (-pair[1], pair[0]))
    return ranked[:k]

orders = [
    {"customer_id": "C00077", "total": 35.84},
    {"customer_id": "C00065", "total": 91.47},
    {"customer_id": "C00077", "total": 246.6},
    {"customer_id": "C01338", "total": 55.72},
]
print(top_customers(orders, 2))
`,
        alternatives: [
          src`
from collections import defaultdict

def top_customers(orders, k):
    spend = defaultdict(int)
    for order in orders:
        spend[order["customer_id"]] += order["total"]
    by_id = sorted(spend.items())
    by_spend = sorted(by_id, key=lambda item: item[1], reverse=True)
    return by_spend[:k]
`,
        ],
        wrong: [
          {
            code: src`
def top_customers(orders, k):
    spend = {}
    for order in orders:
        spend[order["customer_id"]] = spend.get(order["customer_id"], 0) + order["total"]
    ranked = sorted(spend.items(), key=lambda pair: pair[1], reverse=True)
    return ranked[:k]
`,
            fails: ["returns"],
            why: "ties keep first-seen order instead of going to the smaller customer ID",
          },
          {
            code: src`
def top_customers(orders, k):
    spend = {}
    for order in orders:
        spend[order["customer_id"]] = order["total"]
    ranked = sorted(spend.items(), key=lambda pair: (-pair[1], pair[0]))
    return ranked[:k]
`,
            fails: ["returns"],
            why: "each order replaces the customer's spend instead of adding to it",
          },
        ],
        hints: [
          "Total every customer's spend in a single pass over the orders.",
          "Then one sort does the ranking; a key of `(-spend, customer_id)` puts higher spend first and breaks ties by ID.",
          "Slice the first `k` pairs; `items()` already gives `(customer_id, spend)` tuples.",
        ],
        task: {
          checks: [
            fn("returns", "top_customers", [
              example([[{ customer_id: "C00077", total: 35.84 }, { customer_id: "C00065", total: 91.47 }, { customer_id: "C00077", total: 246.6 }, { customer_id: "C01338", total: 55.72 }], 2], [py.tuple(py.str("C00077"), py.float(282.44)), py.tuple(py.str("C00065"), py.float(91.47))]),
              example([[], 3], []),
              example([[{ customer_id: "C1", total: 10 }], 5], [py.tuple(py.str("C1"), py.int(10))]),
              hiddenCase("a tie in spend", [[{ customer_id: "C9", total: 50 }, { customer_id: "C2", total: 50 }, { customer_id: "C5", total: 20 }], 2], [py.tuple(py.str("C2"), py.int(50)), py.tuple(py.str("C9"), py.int(50))]),
              hiddenCase("k of zero", [[{ customer_id: "C1", total: 10 }], 0], []),
            ], { label: "top_customers() ranks customers by total spend", compare: { numbers: "int-float-equal" } }),
            fn("keeps-input", "top_customers", [keepsInput([[{ customer_id: "C1", total: 10 }, { customer_id: "C2", total: 5 }], 1])], { label: "top_customers() leaves the orders unchanged" }),
            {
              kind: "expr",
              id: "reads",
              label: "the orders are read about once for k = 20",
              hidden: true,
              expr: readBudget("[{'customer_id': f'C{i % 300}', 'total': i % 97} for i in range(3000)]", "top_customers(_data, 20)", 6000),
              expected: yes,
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
orders = 2000
payments = 1000
print(orders * payments, orders + payments)
`,
        choices: ["2000000 3000", "3000 2000000", "2000000 2000000", "3000 3000"],
        answer: 0,
        why: "A nested scan compares every order with every payment (2,000,000 comparisons); an index built once costs about one operation per payment plus one per order (3,000).",
      },
      {
        id: "q2",
        prompt: "A common mistake: an \"optimised\" version of a report runs 50× faster but its totals differ from the old version for two customers. What should you do?",
        choices: [
          "Treat it as a bug: find the input where they differ and fix the new version before using it",
          "Ship it, because faster is better",
          "Average the two versions' results",
          "Delete the old version so nobody can compare",
        ],
        answer: 0,
        why: "An optimisation must not change behaviour. Different results mean the new version is wrong (or the old one was), and that has to be resolved first.",
      },
      {
        id: "q3",
        prompt: "A profile shows `normalise_sku` (a string clean-up) taking 2% of the run time, and a nested loop in `match_returns` taking 85%. Where should you start?",
        choices: [
          "Replace the nested loop in match_returns with an index",
          "Rewrite normalise_sku with faster string methods",
          "Add caching to every function",
          "Rewrite everything in a faster language",
        ],
        answer: 0,
        why: "The profile says where the time is. Even making `normalise_sku` free would save at most 2%; fixing the O(n·m) loop can save most of the 85%.",
      },
    ],
    review: [
      "Find the hot spot with a profile; fix the algorithm before the details.",
      "Index once, sort once, hoist unchanging work out of loops.",
      "Prove it: identical results on the same inputs, then fewer operations or a better ratio.",
      "Next module: running work at the same time, with threads and processes.",
    ],
  },
];
