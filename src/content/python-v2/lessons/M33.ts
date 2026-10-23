/**
 * M33 Decorators & Context Managers: five lessons (PY-L33-01 … PY-L33-05).
 *
 * Decorators as functions that take a function and return a replacement (wrappers with *args/**kwargs, the @
 * shorthand), decorator factories with arguments, functools.wraps and why metadata matters, then context managers:
 * classes with __enter__/__exit__ (cleanup that always runs, suppressing chosen exceptions) and contextlib
 * (contextmanager with try/finally, suppress, redirect_stdout, ExitStack).
 *
 * Exercises are graded by applying the learner's decorators to functions the checks define (counting calls,
 * raising on purpose) and by entering their context managers with and without exceptions. Time is injected as a
 * clock function, so nothing depends on how fast the browser is. Fixtures: USGS earthquakes (D08), repository
 * events (D11), Runtime Market settings.
 * Version 2: rewritten from "add a mark to a word" exercises; saved progress from version 1 doesn't count.
 */
import type { PyLesson } from "../model";
import type { PyCheck } from "@/engine/python/grading";
import { example, fn, hiddenCase, pv, raisesCase } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

function expr(id: string, label: string, code: string, expected: unknown, o: { hidden?: boolean; show?: string; raises?: string } = {}): PyCheck {
  return {
    kind: "expr",
    id,
    label,
    ...(o.raises ? { expr: code, raises: o.raises } : { expr: code, expected: pv(expected) }),
    ...(o.show ? { show: o.show } : {}),
    ...(o.hidden ? { hidden: true } : {}),
  };
}

/** A fake clock for checks: each call returns the next of the given times. */
const CLOCK = (times: number[]) => `_times = iter(${JSON.stringify(times)})\ndef _clock():\n    return next(_times)`;

export const m33Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L33-01 decorators
  {
    id: "PY-L33-01",
    version: 2,
    slug: "decorators",
    title: "Decorators: wrap a function",
    lede: "A decorator takes a function and returns a replacement, usually a wrapper that runs some code around the original: counting calls, logging, checking arguments. The @ line above a def is shorthand for passing the function through it.",
    focus: "Write decorators that wrap a function with *args and **kwargs, and apply them with @.",
    minutes: 22,
    objectives: [
      "Explain that `@deco` above `def f` means `f = deco(f)`",
      "Write a wrapper that accepts any arguments, calls the original and returns its result",
      "Keep state for a decorated function and know what happens when the original raises",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "comparison", "conditional-expr", "continue-statement", "conversion", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-default", "function-param", "function-return", "if-statement", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-dict", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "star-args", "star-kwargs", "string-format", "string-index", "string-method", "string-split", "top-level-indent", "try-except", "tuple-unpack", "unquoted-name"],
    teaches: ["decorator-at"],
    blocks: [
      {
        kind: "text",
        md: "Functions are values (see Advanced Functions & Recursion): you can pass one to another function, and a function can build and return a new one that remembers its surroundings (a closure). A **decorator** uses exactly that. It takes a function, defines a **wrapper** that does something extra and calls the original, and returns the wrapper. The wrapper accepts `*args` (a tuple of positional arguments) and `**kwargs` (a dictionary of keyword arguments) and passes them on unchanged, so it fits any function.\n\nWriting `@count_calls` on the line above `def parse_magnitude(...)` is shorthand for `parse_magnitude = count_calls(parse_magnitude)`: the name now refers to the wrapper.",
      },
      {
        kind: "example",
        title: "Counting calls, by hand and with @",
        code: src`
def count_calls(func):
    def wrapper(*args, **kwargs):
        wrapper.calls += 1
        return func(*args, **kwargs)
    wrapper.calls = 0
    return wrapper

def parse_magnitude(text):
    return float(text)

parse_magnitude = count_calls(parse_magnitude)
print(parse_magnitude("5.5"), parse_magnitude(" 4.7 "))
print(parse_magnitude.calls)

@count_calls
def place_name(feature):
    return feature["properties"]["place"]

print(place_name({"properties": {"place": "South Sandwich Islands region"}}))
print(place_name.calls)
`,
        output: "5.5 4.7\n2\nSouth Sandwich Islands region\n1\n",
        note: "The count lives on the wrapper as an attribute, so each decorated function has its own. `@count_calls` did the same reassignment as the line `parse_magnitude = count_calls(parse_magnitude)`, without repeating the name.",
      },
      {
        kind: "text",
        md: "A wrapper runs code before and after the call, and it sees what came back, or the exception that came out. This logging decorator records each call of a parser, including the failures, and then re-raises the error so the caller still knows something went wrong.",
      },
      {
        kind: "example",
        title: "Log every call, including failures",
        code: src`
log = []

def log_calls(func):
    def wrapper(*args, **kwargs):
        try:
            result = func(*args, **kwargs)
        except Exception as err:
            log.append(f"{func.__name__}{args} raised {type(err).__name__}")
            raise
        log.append(f"{func.__name__}{args} -> {result!r}")
        return result
    return wrapper

@log_calls
def parse_depth(text, unit="km"):
    value = float(text)
    return value / 1000 if unit == "m" else value

parse_depth("22")
parse_depth("10", unit="m")
try:
    parse_depth("n/a")
except ValueError:
    pass
for line in log:
    print(line)
`,
        output: "parse_depth('22',) -> 22.0\nparse_depth('10',) -> 0.01\nparse_depth('n/a',) raised ValueError\n",
        note: "`args` is a tuple, which is why one argument prints as `('22',)`. The keyword argument went through `**kwargs` to the original. The bare `raise` sends the ValueError on to the caller after logging it.",
      },
      {
        kind: "text",
        md: "Forget the last line of a decorator and the decorated name becomes `None`:",
      },
      {
        kind: "error-example",
        title: "A decorator that returns nothing",
        code: src`
def count_calls(func):
    def wrapper(*args, **kwargs):
        wrapper.calls += 1
        return func(*args, **kwargs)
    wrapper.calls = 0

@count_calls
def parse_magnitude(text):
    return float(text)

print(parse_magnitude("5.5"))
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: 'NoneType' object is not callable`. `count_calls` ended without `return wrapper`, so `parse_magnitude = count_calls(parse_magnitude)` stored None.",
      },
      {
        kind: "text",
        md: "**When to use it:** behaviour that many functions need in the same way and that isn't their main job: counting, logging, timing, caching, checking arguments. **Mistakes to avoid:** forgetting `return wrapper`; a wrapper that calls the function but doesn't `return` its result; a wrapper with fixed parameters instead of `*args, **kwargs`; and swallowing the original's exceptions.",
      },
    ],
    tryIt: {
      id: "try",
      title: "The result disappears",
      prompt: "`log_calls` records each call, but every decorated function now returns `None`. Make the wrapper return the original function's result.",
      spec: [
        ["Decorator", "`log_calls(func)`; the wrapper appends the function's name to `calls` and calls it"],
        ["Fix", "the decorated function must return what the original returns"],
      ],
      starter: src`
calls = []

def log_calls(func):
    def wrapper(*args, **kwargs):
        calls.append(func.__name__)
        func(*args, **kwargs)
    return wrapper

@log_calls
def parse_magnitude(text):
    return float(text)

print(parse_magnitude("5.5"), calls)
`,
      answer: src`
calls = []

def log_calls(func):
    def wrapper(*args, **kwargs):
        calls.append(func.__name__)
        return func(*args, **kwargs)
    return wrapper

@log_calls
def parse_magnitude(text):
    return float(text)

print(parse_magnitude("5.5"), calls)
`,
      wrong: [
        {
          code: src`
calls = []

def log_calls(func):
    def wrapper(*args, **kwargs):
        calls.append(func.__name__)
        return func(*args)
    return wrapper

@log_calls
def parse_magnitude(text):
    return float(text)
`,
          fails: ["kwargs"],
          why: "the keyword arguments are dropped on the way to the original",
        },
      ],
      hints: ["The wrapper calls the original but throws the answer away.", "Whatever the original returns, the wrapper must hand back.", "Put `return` in front of the call."],
      task: {
        checks: [
          expr("returns", "the decorated parser returns the number", "result = parse_magnitude('6.1')", 6.1, { show: "parse_magnitude('6.1')" }),
          expr("kwargs", "keyword arguments still reach the original", "@log_calls\ndef _scale(value, factor=1):\n    return value * factor\nresult = _scale(3, factor=4)", 12, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Remember slow answers",
        prompt: "Looking up a station's metadata over the network takes a second each time, and a report asks for the same few stations again and again. Write a decorator `memoize(func)`: the wrapper keeps a dictionary `wrapper.cache` from the tuple of positional arguments to the result; when the arguments were seen before it returns the stored result without calling `func`.",
        spec: [
          ["Decorator", "`memoize(func)` for functions called with positional arguments only"],
          ["Wrapper", "has an attribute `cache`: a dictionary from `args` (a tuple) to the result"],
          ["Behaviour", "the original runs once per distinct argument tuple; results are identical to calling it directly"],
        ],
        starter: src`
def memoize(func):
    return func

lookups = []

@memoize
def station_name(station_id):
    lookups.append(station_id)
    return {"USW00094846": "Chicago O'Hare", "USW00023174": "Los Angeles Intl"}[station_id]

print(station_name("USW00094846"), station_name("USW00094846"), station_name("USW00023174"))
print(lookups)
`,
        answer: src`
def memoize(func):
    def wrapper(*args):
        if args not in wrapper.cache:
            wrapper.cache[args] = func(*args)
        return wrapper.cache[args]
    wrapper.cache = {}
    return wrapper

lookups = []

@memoize
def station_name(station_id):
    lookups.append(station_id)
    return {"USW00094846": "Chicago O'Hare", "USW00023174": "Los Angeles Intl"}[station_id]

print(station_name("USW00094846"), station_name("USW00094846"), station_name("USW00023174"))
print(lookups)
`,
        alternatives: [
          src`
def memoize(func):
    cache = {}
    def wrapper(*args):
        try:
            return cache[args]
        except KeyError:
            result = cache[args] = func(*args)
            return result
    wrapper.cache = cache
    return wrapper
`,
        ],
        wrong: [
          {
            code: src`
def memoize(func):
    def wrapper(*args):
        if args[0] not in wrapper.cache:
            wrapper.cache[args[0]] = func(*args)
        return wrapper.cache[args[0]]
    wrapper.cache = {}
    return wrapper
`,
            fails: ["two-args", "cache"],
            why: "only the first argument is the key, so calls that differ in later arguments share an answer",
          },
          {
            code: src`
def memoize(func):
    def wrapper(*args):
        if args not in wrapper.cache:
            wrapper.cache[args] = func(*args)
            return wrapper.cache[args]
    wrapper.cache = {}
    return wrapper
`,
            fails: ["returns", "two-args"],
            why: "the stored result is returned only the first time; a repeat call returns None",
          },
          {
            code: src`
cache = {}

def memoize(func):
    def wrapper(*args):
        if args not in cache:
            cache[args] = func(*args)
        return cache[args]
    wrapper.cache = cache
    return wrapper
`,
            fails: ["cache", "separate"],
            why: "every decorated function shares one cache, so two functions called with the same arguments mix up their answers",
          },
        ],
        hints: [
          "The wrapper takes `*args`; that tuple can be a dictionary key.",
          "Create the dictionary once, when the decorator runs, and attach it to the wrapper.",
          "Call the original only when the key is missing; either way, return the stored value.",
        ],
        task: {
          checks: [
            expr("returns", "repeated calls give the same answers but run the original once each", "_runs = []\n@memoize\ndef _name(station_id):\n    _runs.append(station_id)\n    return station_id.lower()\nresult = ([_name('USW00094846'), _name('USW00094846'), _name('USW00023174')], _runs)", py.tuple(pv(["usw00094846", "usw00094846", "usw00023174"]), pv(["USW00094846", "USW00023174"])), { show: "three calls, two distinct stations: answers and the stations actually looked up" }),
            expr("cache", "the cache maps argument tuples to results", "@memoize\ndef _area(w, h):\n    return w * h\n_area(2, 3)\n_area(4, 5)\nresult = _area.cache", py.dict([[py.tuple(py.int(2), py.int(3)), py.int(6)], [py.tuple(py.int(4), py.int(5)), py.int(20)]]), { show: "area.cache after area(2, 3) and area(4, 5)" }),
            expr("two-args", "calls that differ only in the second argument", "_runs = []\n@memoize\ndef _rate(base, quote):\n    _runs.append((base, quote))\n    return base + '/' + quote\nresult = (_rate('USD', 'EUR'), _rate('USD', 'GBP'), _rate('USD', 'EUR'), len(_runs))", py.tuple(py.str("USD/EUR"), py.str("USD/GBP"), py.str("USD/EUR"), py.int(2)), { hidden: true }),
            expr("separate", "two memoized functions with the same arguments", "@memoize\ndef _double(x):\n    return x * 2\n@memoize\ndef _square(x):\n    return x * x\nresult = (_double(3), _square(3))", py.tuple(py.int(6), py.int(9)), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "From one row to many, skipping bad rows",
        prompt: "Parsers are written for one row; imports need many. Write a decorator `for_each_row(func)` that turns a one-row parser into one that takes a **list of rows**, returns the list of parsed results, and skips rows the parser rejects with `ValueError`. The wrapper keeps the rejected rows (with the error message) in `wrapper.rejected`, emptied at the start of every call.",
        spec: [
          ["Decorator", "`for_each_row(func)`; the original takes one row"],
          ["Wrapper", "takes a list of rows; returns the results of the rows that parsed, in order"],
          ["rejected", "`wrapper.rejected` is a list of `(row, message)` for the last call only"],
          ["Other errors", "anything other than ValueError is not caught"],
        ],
        starter: src`
def for_each_row(func):
    return func

@for_each_row
def parse_quake(row):
    place, mag = row.split(";")
    return {"place": place, "mag": float(mag)}

print(parse_quake(["Rabaul;4.7", "Wright;n/a", "Easter Island;5.3"]))
print(parse_quake.rejected)
`,
        answer: src`
def for_each_row(func):
    def wrapper(rows):
        wrapper.rejected = []
        results = []
        for row in rows:
            try:
                results.append(func(row))
            except ValueError as err:
                wrapper.rejected.append((row, str(err)))
        return results
    wrapper.rejected = []
    return wrapper

@for_each_row
def parse_quake(row):
    place, mag = row.split(";")
    return {"place": place, "mag": float(mag)}

print(parse_quake(["Rabaul;4.7", "Wright;n/a", "Easter Island;5.3"]))
print(parse_quake.rejected)
`,
        alternatives: [
          src`
def for_each_row(func):
    def wrapper(rows):
        good, bad = [], []
        for row in rows:
            try:
                value = func(row)
            except ValueError as err:
                bad.append((row, f"{err}"))
                continue
            good.append(value)
        wrapper.rejected = bad
        return good
    wrapper.rejected = []
    return wrapper
`,
        ],
        wrong: [
          {
            code: src`
def for_each_row(func):
    def wrapper(rows):
        results = []
        for row in rows:
            try:
                results.append(func(row))
            except ValueError as err:
                wrapper.rejected.append((row, str(err)))
        return results
    wrapper.rejected = []
    return wrapper
`,
            fails: ["fresh"],
            why: "`rejected` is never emptied, so rows rejected in earlier calls are still listed",
          },
          {
            code: src`
def for_each_row(func):
    def wrapper(rows):
        wrapper.rejected = []
        results = []
        for row in rows:
            try:
                results.append(func(row))
            except Exception as err:
                wrapper.rejected.append((row, str(err)))
        return results
    wrapper.rejected = []
    return wrapper
`,
            fails: ["other-errors"],
            why: "catching every exception hides real bugs, such as a KeyError, as rejected rows",
          },
          {
            code: src`
def for_each_row(func):
    def wrapper(rows):
        wrapper.rejected = []
        results = []
        for row in rows:
            try:
                results.append(func(row))
            except ValueError:
                wrapper.rejected.append(row)
        return results
    wrapper.rejected = []
    return wrapper
`,
            fails: ["rejected"],
            why: "only the row is kept, not the reason it was rejected",
          },
        ],
        hints: [
          "The wrapper's parameter is the list of rows; it calls the original once per row.",
          "Reset `wrapper.rejected` at the start of each call; catch only ValueError around each row.",
          "Keep each rejected row together with `str(err)`, and return the list of good results.",
        ],
        task: {
          checks: [
            expr("returns", "parsed rows come back, bad ones are skipped", "@for_each_row\ndef _parse_quake(row):\n    place, mag = row.split(';')\n    return {'place': place, 'mag': float(mag)}\nresult = _parse_quake(['Rabaul;4.7', 'Wright;n/a', 'Easter Island;5.3'])", [{ place: "Rabaul", mag: 4.7 }, { place: "Easter Island", mag: 5.3 }], { show: "parse_quake(['Rabaul;4.7', 'Wright;n/a', 'Easter Island;5.3'])" }),
            expr("rejected", "rejected rows are kept with the reason", "@for_each_row\ndef _int(row):\n    return int(row)\n_int(['12', 'x', '7'])\nresult = _int.rejected", py.list(py.tuple(py.str("x"), py.str("invalid literal for int() with base 10: 'x'"))), { show: "parse.rejected after parse(['12', 'x', '7'])" }),
            expr("fresh", "a second call starts with an empty rejected list", "@for_each_row\ndef _int(row):\n    return int(row)\n_int(['a', 'b'])\n_got = _int(['3'])\nresult = (_got, _int.rejected)", py.tuple(pv([3]), py.list()), { hidden: true }),
            expr("other-errors", "an error that isn't a ValueError is not swallowed", "@for_each_row\ndef _place(row):\n    return row['place']\n_place([{'place': 'Rabaul'}, {'mag': 4.7}])", null, { hidden: true, raises: "KeyError" }),
            expr("empty", "no rows", "@for_each_row\ndef _f(row):\n    return row\nresult = (_f([]), _f.rejected)", py.tuple(py.list(), py.list()), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def shout(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs).upper()
    return wrapper

def greet(name, greeting="hello"):
    return f"{greeting}, {name}"

loud = shout(greet)
print(greet("Ana"))
print(loud("Ana", greeting="hi"))
`,
        choices: ["hello, Ana\nHI, ANA", "HELLO, ANA\nHI, ANA", "hello, Ana\nhi, Ana", "hello, Ana\nHELLO, ANA"],
        answer: 0,
        why: "`shout(greet)` returns a new function; `greet` itself is unchanged because nothing reassigned the name. The keyword argument passed through `**kwargs`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: the wrapper has fixed parameters. What does this print?",
        program: src`
def log_calls(func):
    def wrapper(text):
        print("calling", func.__name__)
        return func(text)
    return wrapper

@log_calls
def parse_depth(text, unit="km"):
    return float(text)

try:
    parse_depth("10", unit="m")
except TypeError as err:
    print("TypeError:", err)
`,
        choices: [
          "TypeError: log_calls.<locals>.wrapper() got an unexpected keyword argument 'unit'",
          "calling parse_depth",
          "calling parse_depth\nTypeError: parse_depth() got an unexpected keyword argument 'unit'",
          "10.0",
        ],
        answer: 0,
        why: "The wrapper only accepts `text`, so the call fails before the wrapper's body runs. `*args, **kwargs` would pass `unit` through to the original.",
      },
      {
        id: "q3",
        prompt: "What does `@timed` above `def load(path):` do?",
        choices: [
          "After defining `load`, it runs `load = timed(load)`, so `load` now names whatever `timed` returned",
          "It calls `timed` every time `load` is called, before the body",
          "It marks `load` as private to the module",
          "It runs `load` once immediately and stores the time",
        ],
        answer: 0,
        why: "Decoration happens once, when the `def` runs. Every later call goes to the returned function, usually a wrapper that calls the original.",
      },
    ],
    review: [
      "A decorator takes a function and returns a replacement; `@deco` above `def f` means `f = deco(f)`.",
      "A wrapper takes `*args, **kwargs`, calls the original with them, and returns its result.",
      "State such as a count or a cache can live on the wrapper; let exceptions through unless handling them is the decorator's job.",
      "Next: decorators that take their own settings, like `@retry_on(TimeoutError, attempts=3)`.",
    ],
  },

  // ------------------------------------------------------------------ PY-L33-02 decorator arguments
  {
    id: "PY-L33-02",
    version: 2,
    slug: "decorator-arguments",
    title: "Decorators with arguments",
    lede: "@retry_on(TimeoutError, attempts=3) is a call that returns a decorator. The outer function receives the settings, builds the decorator, and the wrapper inside can use both the settings and the original function.",
    focus: "Write decorator factories: a function that takes settings and returns the decorator.",
    minutes: 22,
    objectives: [
      "Read `@deco(arg)` as `f = deco(arg)(f)` and name the three layers",
      "Write decorators configured by arguments: required keys, value limits, retries",
      "Keep per-function state and injected dependencies (sleep, clock) in the closure",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "boolean", "comp-if", "comparison", "conversion", "decorator-at", "dict-get", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "nested-dict", "none-value", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "reassignment", "star-args", "star-kwargs", "string-format", "string-index", "top-level-indent", "truthiness", "try-except", "tuple-literal", "tuple-unpack", "with-statement"],
    teaches: ["decorator-call"],
    blocks: [
      {
        kind: "text",
        md: "Many decorators need settings: which exceptions to retry, how many attempts, which keys a record must have. Python handles that with one more layer. In `@require_keys(\"id\", \"properties\")` the expression after `@` is evaluated first: `require_keys(\"id\", \"properties\")` returns a decorator, and that decorator is applied to the function. So `@deco(arg)` means `f = deco(arg)(f)`.\n\nThe code has three nested functions: the **factory** takes the settings, the **decorator** takes the function, and the **wrapper** takes the call's arguments. Each inner function can see the names of the ones around it.",
      },
      {
        kind: "example",
        title: "Required keys for a record",
        code: src`
def require_keys(*keys):
    def decorator(func):
        def wrapper(record, *args, **kwargs):
            missing = [key for key in keys if key not in record]
            if missing:
                raise KeyError(f"{func.__name__} needs {', '.join(missing)}")
            return func(record, *args, **kwargs)
        return wrapper
    return decorator

@require_keys("id", "properties")
def summary(feature):
    return f"{feature['id']}: M{feature['properties']['mag']}"

print(summary({"id": "us6000pgsd", "properties": {"mag": 5.5}}))
try:
    summary({"properties": {"mag": 4.7}})
except KeyError as err:
    print("KeyError:", err)
`,
        output: "us6000pgsd: M5.5\nKeyError: 'summary needs id'\n",
        note: "`keys` is the tuple of settings given to the factory, `func` the decorated function, `record` the first argument of each call. A KeyError's message prints with quotes around it.",
      },
      {
        kind: "text",
        md: "Settings can be behaviour too. A retry decorator needs to know which exceptions are temporary, how many attempts to make, and how to wait. Passing `sleep` in as a setting means tests (and this example) can record the waits instead of actually waiting.",
      },
      {
        kind: "example",
        title: "Retry chosen exceptions",
        code: src`
import time

def retry_on(*exceptions, attempts=3, sleep=time.sleep):
    def decorator(func):
        def wrapper(*args, **kwargs):
            for attempt in range(1, attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions:
                    if attempt == attempts:
                        raise
                    sleep(2 ** (attempt - 1))
        return wrapper
    return decorator

waits = []
outcomes = iter([ConnectionError("reset"), TimeoutError("slow"), {"count": 7}])

@retry_on(ConnectionError, TimeoutError, attempts=4, sleep=waits.append)
def fetch_count():
    outcome = next(outcomes)
    if isinstance(outcome, Exception):
        raise outcome
    return outcome

print(fetch_count(), waits)
`,
        output: "{'count': 7} [1, 2]\n",
        note: "`except exceptions:` works because `exceptions` is a tuple of exception classes. The first two calls failed with retryable errors (waits of 1 and 2 seconds went into the list instead of being slept), the third succeeded.",
      },
      {
        kind: "text",
        md: "**When to use it:** whenever a decorator's behaviour should vary per function: limits, names, exception types, intervals. **Mistakes to avoid:** writing `@retry_on` without the brackets for a factory (the function is passed as the first *setting*, and the result isn't a working decorator); returning the wrong layer (each layer must return the one inside it); and putting per-call state in the factory, where every call of the decorated function shares it.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A lower limit too",
      prompt: "`clamp(low, high)` is meant to keep a function's numeric result between `low` and `high`, but the wrapper only applies the upper limit. Make it apply the lower limit as well.",
      spec: [
        ["Factory", "`clamp(low, high)`"],
        ["Wrapper", "returns the result, raised to `low` if smaller, lowered to `high` if larger"],
      ],
      starter: src`
def clamp(low, high):
    def decorator(func):
        def wrapper(*args, **kwargs):
            return min(func(*args, **kwargs), high)
        return wrapper
    return decorator

@clamp(0, 100)
def humidity(reading):
    return float(reading)

print(humidity("104.5"), humidity("-3"), humidity("55"))
`,
      answer: src`
def clamp(low, high):
    def decorator(func):
        def wrapper(*args, **kwargs):
            return max(low, min(func(*args, **kwargs), high))
        return wrapper
    return decorator

@clamp(0, 100)
def humidity(reading):
    return float(reading)

print(humidity("104.5"), humidity("-3"), humidity("55"))
`,
      wrong: [
        {
          code: src`
def clamp(low, high):
    def decorator(func):
        def wrapper(*args, **kwargs):
            return min(low, max(func(*args, **kwargs), high))
        return wrapper
    return decorator

@clamp(0, 100)
def humidity(reading):
    return float(reading)
`,
          fails: ["returns", "other"],
          why: "`min` and `max` are swapped, so every result becomes `low`",
        },
      ],
      hints: ["`min(result, high)` handles values that are too big.", "Values that are too small need the opposite function.", "Wrap the existing expression in `max(low, ...)`."],
      task: {
        checks: [
          expr("returns", "humidity is kept between 0 and 100", "result = [humidity('104.5'), humidity('-3'), humidity('55')]", [100, 0, py.float(55)], { show: "[humidity('104.5'), humidity('-3'), humidity('55')]" }),
          expr("other", "another range", "@clamp(-40, 50)\ndef _t(x):\n    return x\nresult = [_t(-60), _t(12), _t(70)]", [-40, 12, 50], { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Warn about deprecated functions",
        prompt: "A library is renaming functions and wants old names to keep working for a while, with a warning. Write a factory `deprecated(replacement)`: calling a decorated function issues `warnings.warn(\"<name> is deprecated; use <replacement>\", DeprecationWarning)` the **first** time only, then always calls the original and returns its result.",
        spec: [
          ["Factory", "`deprecated(replacement)` → decorator"],
          ["Warning", "message `\"quake_count is deprecated; use count_events\"`, category `DeprecationWarning`, on the first call of each decorated function"],
          ["Result", "the original's result, on every call"],
        ],
        starter: src`
import warnings

def deprecated(replacement):
    def decorator(func):
        return func
    return decorator

@deprecated("count_events")
def quake_count(features):
    return len(features)

with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always")
    print(quake_count([1, 2]), quake_count([3]))
print([str(w.message) for w in caught])
`,
        answer: src`
import warnings

def deprecated(replacement):
    def decorator(func):
        def wrapper(*args, **kwargs):
            if not wrapper.warned:
                warnings.warn(f"{func.__name__} is deprecated; use {replacement}", DeprecationWarning)
                wrapper.warned = True
            return func(*args, **kwargs)
        wrapper.warned = False
        return wrapper
    return decorator

@deprecated("count_events")
def quake_count(features):
    return len(features)

with warnings.catch_warnings(record=True) as caught:
    warnings.simplefilter("always")
    print(quake_count([1, 2]), quake_count([3]))
print([str(w.message) for w in caught])
`,
        alternatives: [
          src`
import warnings

def deprecated(replacement):
    def decorator(func):
        state = {"warned": False}
        def wrapper(*args, **kwargs):
            if not state["warned"]:
                state["warned"] = True
                warnings.warn(func.__name__ + " is deprecated; use " + replacement, category=DeprecationWarning, stacklevel=2)
            return func(*args, **kwargs)
        return wrapper
    return decorator
`,
        ],
        wrong: [
          {
            code: src`
import warnings

def deprecated(replacement):
    def decorator(func):
        def wrapper(*args, **kwargs):
            warnings.warn(f"{func.__name__} is deprecated; use {replacement}", DeprecationWarning)
            return func(*args, **kwargs)
        return wrapper
    return decorator
`,
            fails: ["once"],
            why: "it warns on every call instead of only the first",
          },
          {
            code: src`
import warnings

def deprecated(replacement):
    warned = []
    def decorator(func):
        def wrapper(*args, **kwargs):
            if not warned:
                warnings.warn(f"{func.__name__} is deprecated; use {replacement}", DeprecationWarning)
                warned.append(True)
            return func(*args, **kwargs)
        return wrapper
    return decorator
`,
            fails: ["each-function"],
            why: "the flag is created once per factory call, so two functions decorated with the same `deprecated(...)` result share it and only the first one warns",
          },
          {
            code: src`
import warnings

def deprecated(replacement):
    def decorator(func):
        def wrapper(*args, **kwargs):
            if not wrapper.warned:
                warnings.warn(f"{func.__name__} is deprecated; use {replacement}")
                wrapper.warned = True
            return func(*args, **kwargs)
        wrapper.warned = False
        return wrapper
    return decorator
`,
            fails: ["category"],
            why: "without a category the warning is a UserWarning, which tools that look for deprecations don't recognise",
          },
        ],
        hints: [
          "Three layers: the factory keeps `replacement`, the decorator keeps `func`, the wrapper runs on every call.",
          "Remember per decorated function whether it has warned already: an attribute on the wrapper set in the decorator layer works.",
          "`warnings.warn(message, DeprecationWarning)` issues the warning; the message uses `func.__name__`.",
        ],
        task: {
          checks: [
            expr("returns", "results are unchanged", "import warnings as _w\n@deprecated('count_events')\ndef _quake_count(features):\n    return len(features)\nwith _w.catch_warnings():\n    _w.simplefilter('ignore')\n    result = (_quake_count([1, 2, 3]), _quake_count([]))", py.tuple(py.int(3), py.int(0)), { show: "quake_count([1, 2, 3]), quake_count([])" }),
            expr("message", "the first call warns with the new name", "import warnings as _w\n@deprecated('read_events')\ndef _load(path):\n    return path\nwith _w.catch_warnings(record=True) as _caught:\n    _w.simplefilter('always')\n    _load('a.jsonl')\nresult = [str(_x.message) for _x in _caught]", ["_load is deprecated; use read_events"], { show: "the warnings from the first call of a deprecated function" }),
            expr("once", "three calls warn once", "import warnings as _w\n@deprecated('new')\ndef _old():\n    return 1\nwith _w.catch_warnings(record=True) as _caught:\n    _w.simplefilter('always')\n    _old(); _old(); _old()\nresult = len(_caught)", 1, { hidden: true }),
            expr("each-function", "two functions deprecated with one shared factory call", "import warnings as _w\n_mark = deprecated('v2_api')\n@_mark\ndef _a():\n    return 'a'\n@_mark\ndef _b():\n    return 'b'\nwith _w.catch_warnings(record=True) as _caught:\n    _w.simplefilter('always')\n    _a(); _b()\nresult = [str(_x.message) for _x in _caught]", ["_a is deprecated; use v2_api", "_b is deprecated; use v2_api"], { hidden: true }),
            expr("category", "the warning is a DeprecationWarning", "import warnings as _w\n@deprecated('x')\ndef _c():\n    return 0\nwith _w.catch_warnings(record=True) as _caught:\n    _w.simplefilter('always')\n    _c()\nresult = _caught[0].category.__name__", "DeprecationWarning", { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Cache for a while",
        prompt: "Exchange rates change, so caching them forever is wrong, but asking the rate API on every call is slow. Write a factory `cache_for(seconds, clock)`: the decorated function remembers each result per argument tuple together with the time it was computed (from `clock()`), and reuses it while it is **less than** `seconds` old; after that it calls the original again and stores the new result.",
        spec: [
          ["Factory", "`cache_for(seconds, clock)`; `clock()` returns the current time in seconds (`time.monotonic` in production)"],
          ["Wrapper", "positional arguments only; reuses a result while `clock() - stored_time < seconds`"],
          ["Each function", "has its own cache"],
        ],
        starter: src`
import time

def cache_for(seconds, clock=time.monotonic):
    def decorator(func):
        return func
    return decorator

now = [0]
calls = []

@cache_for(60, clock=lambda: now[0])
def usd_rate(currency):
    calls.append(currency)
    return {"EUR": 0.92, "GBP": 0.79}[currency]

print(usd_rate("EUR"))
now[0] = 30
print(usd_rate("EUR"))
now[0] = 61
print(usd_rate("EUR"), calls)
`,
        answer: src`
import time

def cache_for(seconds, clock=time.monotonic):
    def decorator(func):
        stored = {}
        def wrapper(*args):
            now = clock()
            if args in stored:
                saved_at, result = stored[args]
                if now - saved_at < seconds:
                    return result
            result = func(*args)
            stored[args] = (now, result)
            return result
        return wrapper
    return decorator

now = [0]
calls = []

@cache_for(60, clock=lambda: now[0])
def usd_rate(currency):
    calls.append(currency)
    return {"EUR": 0.92, "GBP": 0.79}[currency]

print(usd_rate("EUR"))
now[0] = 30
print(usd_rate("EUR"))
now[0] = 61
print(usd_rate("EUR"), calls)
`,
        alternatives: [
          src`
import time

def cache_for(seconds, clock=time.monotonic):
    def decorator(func):
        def wrapper(*args):
            entry = wrapper.entries.get(args)
            if entry is None or clock() - entry[0] >= seconds:
                entry = (clock(), func(*args))
                wrapper.entries[args] = entry
            return entry[1]
        wrapper.entries = {}
        return wrapper
    return decorator
`,
        ],
        wrong: [
          {
            code: src`
import time

def cache_for(seconds, clock=time.monotonic):
    def decorator(func):
        stored = {}
        def wrapper(*args):
            if args not in stored:
                stored[args] = func(*args)
            return stored[args]
        return wrapper
    return decorator
`,
            fails: ["returns", "boundary", "expiry"],
            why: "results never expire, so an old rate is served forever",
          },
          {
            code: src`
import time

def cache_for(seconds, clock=time.monotonic):
    def decorator(func):
        stored = {}
        def wrapper(*args):
            now = clock()
            if args in stored and now - stored[args][0] <= seconds:
                return stored[args][1]
            stored[args] = (now, func(*args))
            return stored[args][1]
        return wrapper
    return decorator
`,
            fails: ["boundary"],
            why: "`<=` still serves a result that is exactly `seconds` old",
          },
          {
            code: src`
import time

stored = {}

def cache_for(seconds, clock=time.monotonic):
    def decorator(func):
        def wrapper(*args):
            now = clock()
            if args in stored and now - stored[args][0] < seconds:
                return stored[args][1]
            stored[args] = (now, func(*args))
            return stored[args][1]
        return wrapper
    return decorator
`,
            fails: ["per-argument", "separate"],
            why: "one cache for every decorated function, so two functions with the same arguments get each other's results",
          },
        ],
        hints: [
          "Each decorated function needs its own dictionary: create it in the decorator layer.",
          "Store the time next to the result, `(time, result)`, under the argument tuple.",
          "On a call, hand back the saved value only while it is younger than `seconds`; otherwise call the original and save the new pair.",
        ],
        task: {
          checks: [
            expr("returns", "a result is reused within the time and refreshed after", "_now = [0]\n_calls = []\n@cache_for(60, clock=lambda: _now[0])\ndef _rate(c):\n    _calls.append(c)\n    return len(_calls)\n_a = _rate('EUR')\n_now[0] = 30\n_b = _rate('EUR')\n_now[0] = 61\n_c = _rate('EUR')\nresult = ([_a, _b, _c], _calls)", py.tuple(pv([1, 1, 2]), pv(["EUR", "EUR"])), { show: "calls at 0 s, 30 s and 61 s with a 60-second cache" }),
            expr("per-argument", "different arguments are cached separately", "_now = [0]\n_calls = []\n@cache_for(10, clock=lambda: _now[0])\ndef _rate(c):\n    _calls.append(c)\n    return c\n_rate('EUR'); _rate('GBP'); _rate('EUR')\nresult = _calls", ["EUR", "GBP"], { show: "_calls after EUR, GBP, EUR within 10 s" }),
            expr("boundary", "a result exactly `seconds` old is refreshed", "_now = [100]\n_calls = []\n@cache_for(5, clock=lambda: _now[0])\ndef _f(x):\n    _calls.append(x)\n    return x\n_f(1)\n_now[0] = 105\n_f(1)\nresult = len(_calls)", 2, { hidden: true }),
            expr("expiry", "the new result is cached again after a refresh", "_now = [0]\n_calls = []\n@cache_for(10, clock=lambda: _now[0])\ndef _f(x):\n    _calls.append(_now[0])\n    return x\n_f('a')\n_now[0] = 15\n_f('a')\n_now[0] = 20\n_f('a')\nresult = _calls", [0, 15], { hidden: true }),
            expr("separate", "two cached functions with the same argument", "_now = [0]\n@cache_for(60, clock=lambda: _now[0])\ndef _up(x):\n    return x.upper()\n@cache_for(60, clock=lambda: _now[0])\ndef _down(x):\n    return x.lower()\nresult = (_up('Eur'), _down('Eur'))", py.tuple(py.str("EUR"), py.str("eur")), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
def tag(label):
    print("factory", label)
    def decorator(func):
        print("decorating", func.__name__)
        def wrapper():
            return label + ":" + func()
        return wrapper
    return decorator

@tag("v2")
def version():
    return "ok"

print(version())
print(version())
`,
        choices: ["factory v2\ndecorating version\nv2:ok\nv2:ok", "v2:ok\nv2:ok", "factory v2\ndecorating version\nv2:ok\nfactory v2\ndecorating version\nv2:ok", "decorating version\nfactory v2\nv2:ok\nv2:ok"],
        answer: 0,
        why: "The factory and the decorator run once, when the `def` is executed, in that order. Each call afterwards only runs the wrapper.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a factory used without its brackets. What does this print?",
        program: src`
def require_keys(*keys):
    def decorator(func):
        def wrapper(record):
            return func(record)
        return wrapper
    return decorator

@require_keys
def summary(feature):
    return feature["id"]

print(summary.__name__)
`,
        choices: ["decorator", "summary", "wrapper", "require_keys"],
        answer: 0,
        why: "Without brackets, `summary` itself was passed to `require_keys` as a key, and the name `summary` now holds the inner `decorator` function. Calling it with a record would treat the record as the function to decorate.",
      },
      {
        id: "q3",
        prompt: "In `def retry_on(*exceptions, attempts=3):` → `def decorator(func):` → `def wrapper(*args, **kwargs):`, where does the code that runs on every call go?",
        choices: ["In `wrapper`", "In `retry_on`", "In `decorator`", "After `return decorator`"],
        answer: 0,
        why: "`retry_on` runs once per `@` line with the settings, `decorator` once per decorated function, and `wrapper` every time the decorated function is called.",
      },
    ],
    review: [
      "`@deco(arg)` means `f = deco(arg)(f)`: a factory returns the decorator.",
      "Three layers: settings, function, call. Each returns the one inside it.",
      "Settings can be behaviour, such as `sleep` or `clock`, which keeps the decorator testable.",
      "Next: `functools.wraps`, so a wrapper keeps the original's name and documentation.",
    ],
  },

  // ------------------------------------------------------------------ PY-L33-03 wraps
  {
    id: "PY-L33-03",
    version: 2,
    slug: "functools-wraps",
    title: "functools.wraps: keep the function's identity",
    lede: "A plain wrapper hides the function it wraps: its name becomes wrapper and its docstring disappears. Logs, error messages, help(), test runners and registries that look functions up by name all get confused. functools.wraps copies the original's identity onto the wrapper.",
    focus: "Use functools.wraps in every wrapper, and use the metadata it copies.",
    minutes: 18,
    objectives: [
      "Explain what a wrapper loses: `__name__`, `__doc__`, `__qualname__`, `__module__`",
      "Apply `@functools.wraps(func)` to the wrapper inside a decorator",
      "Use `__wrapped__` to reach the original, for testing or introspection",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "comparison", "conversion", "decorator-at", "decorator-call", "dict-literal", "dict-lookup", "enumerate-call", "for-loop", "function-def", "function-doc", "function-param", "function-return", "identity", "if-statement", "import-module", "lambda", "len-call", "list-literal", "list-mutate", "list-sort", "logical", "membership", "none-value", "precedence", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "star-args", "star-kwargs", "string-format", "string-index", "top-level-indent", "truthiness", "tuple-unpack", "type-call", "while-loop"],
    teaches: ["wraps-dec"],
    blocks: [
      {
        kind: "text",
        md: "To the rest of the program, a decorated function *is* its wrapper. So without help, `parse_depth.__name__` says `wrapper`, the docstring is gone, and every decorated function looks the same in a log or a traceback. **`functools.wraps(func)`** is itself a decorator (with an argument!) that you put on the wrapper: it copies `__name__`, `__qualname__`, `__doc__`, `__module__` and the function's attribute dictionary from `func`, and stores the original in `wrapper.__wrapped__`.",
      },
      {
        kind: "example",
        title: "Before and after wraps",
        code: src`
import functools

def plain(func):
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

def careful(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

def parse_depth(text):
    """Depth in km from the USGS text value."""
    return float(text)

a = plain(parse_depth)
b = careful(parse_depth)
print(a.__name__, a.__doc__)
print(b.__name__, b.__doc__)
print(b.__wrapped__ is parse_depth)
`,
        output: "wrapper None\nparse_depth Depth in km from the USGS text value.\nTrue\n",
        note: "Same behaviour, different identity. `help(b)` would now show the right name and docstring, and a traceback would say `parse_depth`.",
      },
      {
        kind: "text",
        md: "It matters most when code finds functions by name. This event-handler registry stores functions under `__name__`. With plain wrappers both handlers register as `wrapper`, and the second silently replaces the first.",
      },
      {
        kind: "example",
        title: "A registry keyed by name",
        code: src`
import functools

def counted(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        wrapper.calls += 1
        return func(*args, **kwargs)
    wrapper.calls = 0
    return wrapper

handlers = {}

def register(func):
    handlers[func.__name__] = func
    return func

@register
@counted
def on_push(event):
    return f"push to {event['repo']}"

@register
@counted
def on_watch(event):
    return f"star on {event['repo']}"

print(sorted(handlers))
print(handlers["on_watch"]({"repo": "tidewater/smartqueue"}), handlers["on_watch"].calls)
print(handlers["on_push"].__wrapped__({"repo": "cobalt-tools/deeplint"}), handlers["on_push"].calls)
`,
        output: "['on_push', 'on_watch']\nstar on tidewater/smartqueue 1\npush to cobalt-tools/deeplint 0\n",
        note: "Decorators apply bottom-up: `counted` wraps first, then `register` stores the result, which `wraps` has given the right name. `__wrapped__` calls the original directly, skipping the counting: useful in a test that wants the bare function.",
      },
      {
        kind: "text",
        md: "**When to use it:** in every wrapper you write; it costs one line. **Mistakes to avoid:** putting `@functools.wraps` on the decorator instead of on the wrapper; writing `@functools.wraps` without `(func)`; and setting attributes on the wrapper *before* `wraps` runs, because `wraps` copies the original's attribute dictionary over the wrapper's.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Give the wrapper its name back",
      prompt: "`timed_with` records how long each call takes under the function's name, but every record says `wrapper`. Add `@functools.wraps(func)` to the wrapper.",
      spec: [
        ["Factory", "`timed_with(clock, records)`: the wrapper appends `(name, seconds)` to `records`"],
        ["Fix", "the decorated function keeps its own `__name__` and `__doc__`"],
      ],
      starter: src`
import functools

def timed_with(clock, records):
    def decorator(func):
        def wrapper(*args, **kwargs):
            start = clock()
            result = func(*args, **kwargs)
            records.append((wrapper.__name__, clock() - start))
            return result
        return wrapper
    return decorator

ticks = iter([0.0, 0.25])
records = []

@timed_with(lambda: next(ticks), records)
def load_events(path):
    """Read the events file."""
    return path

load_events("events.jsonl")
print(records, load_events.__doc__)
`,
      answer: src`
import functools

def timed_with(clock, records):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start = clock()
            result = func(*args, **kwargs)
            records.append((wrapper.__name__, clock() - start))
            return result
        return wrapper
    return decorator

ticks = iter([0.0, 0.25])
records = []

@timed_with(lambda: next(ticks), records)
def load_events(path):
    """Read the events file."""
    return path

load_events("events.jsonl")
print(records, load_events.__doc__)
`,
      wrong: [
        {
          code: src`
import functools

def timed_with(clock, records):
    @functools.wraps(timed_with)
    def decorator(func):
        def wrapper(*args, **kwargs):
            start = clock()
            result = func(*args, **kwargs)
            records.append((wrapper.__name__, clock() - start))
            return result
        return wrapper
    return decorator
`,
          fails: ["returns", "doc"],
          why: "`wraps` is on the wrong function, so the wrapper is still called `wrapper`",
        },
      ],
      hints: ["The function that needs the original's identity is the innermost one.", "`functools.wraps(func)` is a decorator for the wrapper.", "Decorate `def wrapper` with `functools.wraps`, giving it the original function."],
      task: {
        checks: [
          expr("returns", "the record uses the function's own name", "_ticks = iter([1.0, 1.5])\n_records = []\n@timed_with(lambda: next(_ticks), _records)\ndef parse_events(path):\n    return path\nparse_events('x')\nresult = _records", py.list(py.tuple(py.str("parse_events"), py.float(0.5))), { show: "records after one call of parse_events" }),
          expr("doc", "the docstring survives", "@timed_with(lambda: 0, [])\ndef _f():\n    \"\"\"Count stars.\"\"\"\n    return 1\nresult = (_f.__name__, _f.__doc__)", py.tuple(py.str("_f"), py.str("Count stars.")), { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Positive arguments only",
        prompt: "Several pricing functions must never receive a negative or zero number. Write a decorator `positive_args(func)`: before calling `func`, check every positional argument that is an int or float (not a bool); if one is 0 or less, raise `ValueError(\"<name>: argument <position> must be positive\")`, positions counted from 1. The decorated function must keep its name, docstring and `__wrapped__`.",
        spec: [
          ["Decorator", "`positive_args(func)`"],
          ["Raises", "`ValueError(\"line_total: argument 2 must be positive\")` for `line_total(7.49, 0)`"],
          ["Ignores", "text, None, booleans and keyword arguments"],
          ["Identity", "`__name__`, `__doc__` and `__wrapped__` come from the original"],
        ],
        starter: src`
import functools

def positive_args(func):
    return func

@positive_args
def line_total(price, quantity):
    """Price of one line before discounts."""
    return price * quantity

print(line_total(7.49, 3))
print(line_total.__name__, line_total.__doc__)
`,
        answer: src`
import functools

def positive_args(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        for position, value in enumerate(args, start=1):
            is_number = isinstance(value, (int, float)) and not isinstance(value, bool)
            if is_number and value <= 0:
                raise ValueError(f"{func.__name__}: argument {position} must be positive")
        return func(*args, **kwargs)
    return wrapper

@positive_args
def line_total(price, quantity):
    """Price of one line before discounts."""
    return price * quantity

print(line_total(7.49, 3))
print(line_total.__name__, line_total.__doc__)
`,
        alternatives: [
          src`
from functools import wraps

def positive_args(func):
    @wraps(func)
    def checked(*args, **kwargs):
        for i in range(len(args)):
            value = args[i]
            if type(value) in (int, float) and value <= 0:
                raise ValueError(func.__name__ + ": argument " + str(i + 1) + " must be positive")
        return func(*args, **kwargs)
    return checked
`,
        ],
        wrong: [
          {
            code: src`
def positive_args(func):
    def wrapper(*args, **kwargs):
        for position, value in enumerate(args, start=1):
            if isinstance(value, (int, float)) and not isinstance(value, bool) and value <= 0:
                raise ValueError(f"{func.__name__}: argument {position} must be positive")
        return func(*args, **kwargs)
    return wrapper
`,
            fails: ["identity"],
            why: "without `wraps` the decorated function is called `wrapper` and has no docstring",
          },
          {
            code: src`
import functools

def positive_args(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        for position, value in enumerate(args):
            if isinstance(value, (int, float)) and not isinstance(value, bool) and value <= 0:
                raise ValueError(f"{func.__name__}: argument {position} must be positive")
        return func(*args, **kwargs)
    return wrapper
`,
            fails: ["message", "negative-first"],
            why: "positions are counted from 0, so the message names the wrong argument",
          },
          {
            code: src`
import functools

def positive_args(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        for position, value in enumerate(args, start=1):
            if isinstance(value, (int, float)) and value <= 0:
                raise ValueError(f"{func.__name__}: argument {position} must be positive")
        return func(*args, **kwargs)
    return wrapper
`,
            fails: ["bools"],
            why: "`False` is an int equal to 0, so a boolean flag argument is rejected",
          },
        ],
        hints: [
          "Loop over the positional arguments with `enumerate(args, start=1)` to know each position.",
          "Only numbers are checked: `isinstance(value, (int, float))`, excluding booleans, which are ints too.",
          "Decorate the wrapper with `functools.wraps`, passing it the original, so the name, docstring and `__wrapped__` are copied.",
        ],
        task: {
          checks: [
            expr("returns", "valid arguments go through", "@positive_args\ndef _line_total(price, quantity):\n    return price * quantity\nresult = _line_total(7.49, 3)", 22.47, { show: "line_total(7.49, 3)" }),
            expr("message", "a zero quantity is refused with its position", "@positive_args\ndef line_total(price, quantity):\n    return price * quantity\ntry:\n    line_total(7.49, 0)\n    result = 'no error'\nexcept ValueError as _e:\n    result = str(_e)", "line_total: argument 2 must be positive", { show: "line_total(7.49, 0)" }),
            expr("identity", "name, docstring and __wrapped__ come from the original", "def _shipping(weight_kg):\n    \"\"\"Shipping fee by weight.\"\"\"\n    return 4.99\n_d = positive_args(_shipping)\nresult = (_d.__name__, _d.__doc__, _d.__wrapped__ is _shipping)", py.tuple(py.str("_shipping"), py.str("Shipping fee by weight."), py.bool(true)), { show: "__name__, __doc__ and __wrapped__ of a decorated function" }),
            expr("bools", "text, None, booleans and keywords aren't checked", "@positive_args\ndef _fee(amount, label, express, note=None, rate=-1):\n    return amount\nresult = _fee(5, 'standard', False, None, rate=-2)", 5, { hidden: true }),
            expr("negative-first", "a negative first argument", "@positive_args\ndef _area(w, h):\n    return w * h\ntry:\n    _area(-2.5, 4)\n    result = 'no error'\nexcept ValueError as _e:\n    result = str(_e)", "_area: argument 1 must be positive", { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Peel back the decorators",
        prompt: "When a function is wrapped by several decorators that all use `functools.wraps`, each wrapper's `__wrapped__` points one layer down. Write `layers(func)`: return how many decorators wrap `func` and the original function itself, as `(count, original)`, by following `__wrapped__` until a function doesn't have it.",
        spec: [
          ["Function", "`layers(func)`"],
          ["Returns", "`(number_of_wrappers, original_function)`; `(0, func)` for an undecorated function"],
          ["Tip", "`hasattr(f, \"__wrapped__\")` or `getattr(f, \"__wrapped__\", None)` tells you whether there is another layer"],
        ],
        starter: src`
import functools

def layers(func):
    return (0, func)

def traced(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

def fare_per_mile(fare, miles):
    return fare / miles

wrapped = traced(traced(fare_per_mile))
count, original = layers(wrapped)
print(count, original is fare_per_mile, original(40.8, 9.2))
`,
        answer: src`
import functools

def layers(func):
    count = 0
    while hasattr(func, "__wrapped__"):
        func = func.__wrapped__
        count += 1
    return (count, func)

def traced(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

def fare_per_mile(fare, miles):
    return fare / miles

wrapped = traced(traced(fare_per_mile))
count, original = layers(wrapped)
print(count, original is fare_per_mile, original(40.8, 9.2))
`,
        alternatives: [
          src`
def layers(func):
    inner = getattr(func, "__wrapped__", None)
    if inner is None:
        return (0, func)
    count, original = layers(inner)
    return (count + 1, original)
`,
        ],
        wrong: [
          {
            code: src`
def layers(func):
    if hasattr(func, "__wrapped__"):
        return (1, func.__wrapped__)
    return (0, func)
`,
            fails: ["returns", "three"],
            why: "only one layer is peeled off",
          },
          {
            code: src`
def layers(func):
    count = 0
    while func.__name__ == "wrapper":
        func = func.__wrapped__
        count += 1
    return (count, func)
`,
            fails: ["returns", "three"],
            why: "a wrapper made with `wraps` has the original's name, so testing the name finds no layers",
          },
        ],
        hints: [
          "Each wrapper made with `wraps` knows the function one layer down in `__wrapped__`.",
          "Keep stepping down while the current function has that attribute, counting the steps.",
          "When there's no `__wrapped__`, you've reached the original; return the count with it.",
        ],
        task: {
          checks: [
            expr("returns", "two layers around fare_per_mile", "import functools as _ft\ndef _traced(f):\n    @_ft.wraps(f)\n    def w(*a, **k):\n        return f(*a, **k)\n    return w\ndef _fare_per_mile(fare, miles):\n    return fare / miles\n_wrapped = _traced(_traced(_fare_per_mile))\nresult = (layers(_wrapped)[0], layers(_wrapped)[1] is _fare_per_mile)", py.tuple(py.int(2), py.bool(true)), { show: "count and identity of layers(traced(traced(fare_per_mile)))" }),
            expr("none", "an undecorated function", "def _plain():\n    return 1\nresult = (layers(_plain)[0], layers(_plain)[1] is _plain)", py.tuple(py.int(0), py.bool(true)), { show: "layers(plain_function)" }),
            expr("three", "three different decorators", "import functools as _ft\ndef _deco(tag):\n    def d(f):\n        @_ft.wraps(f)\n        def w(*a, **k):\n            return tag + str(f(*a, **k))\n        return w\n    return d\n@_deco('a')\n@_deco('b')\n@_deco('c')\ndef _base():\n    return 0\n_n, _orig = layers(_base)\nresult = (_n, _orig(), _base())", py.tuple(py.int(3), py.int(0), py.str("abc0")), { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import functools

def first(func):
    @functools.wraps(func)
    def wrapper(*args):
        return "first(" + func(*args) + ")"
    return wrapper

def second(func):
    @functools.wraps(func)
    def wrapper(*args):
        return "second(" + func(*args) + ")"
    return wrapper

@first
@second
def label():
    return "x"

print(label(), label.__name__)
`,
        choices: ["first(second(x)) label", "second(first(x)) label", "first(second(x)) wrapper", "first(x) label"],
        answer: 0,
        why: "Decorators apply bottom-up: `second` wraps `label`, then `first` wraps that. Calling runs the outer wrapper first. Both used `wraps`, so the name is still `label`.",
      },
      {
        id: "q2",
        prompt: "A common mistake: an attribute set before `wraps` runs. What does this print?",
        program: src`
import functools

def counted(func):
    def wrapper(*args):
        return func(*args)
    wrapper.calls = 0
    wrapper = functools.wraps(func)(wrapper)
    return wrapper

def report():
    return "ok"

report.calls = "not counted"
print(counted(report).calls)
`,
        choices: ["not counted", "0", "AttributeError", "None"],
        answer: 0,
        why: "`wraps` copies the original's attribute dictionary onto the wrapper, overwriting `calls`. Apply `wraps` first (as a decorator on `def wrapper`), then set the wrapper's own attributes.",
      },
      {
        id: "q3",
        prompt: "Which tool is broken by a wrapper that doesn't use `functools.wraps`?",
        choices: [
          "A plugin registry that stores functions under `func.__name__`",
          "Calling the decorated function with positional arguments",
          "Returning a value from the decorated function",
          "Raising an exception inside the decorated function",
        ],
        answer: 0,
        why: "Calls, return values and exceptions work either way. Anything that reads the function's identity (its name, docstring, `help`, logs, registries) sees `wrapper` instead.",
      },
    ],
    review: [
      "A plain wrapper replaces the function's name and docstring with its own.",
      "`@functools.wraps(func)` on the wrapper copies the identity and adds `__wrapped__`.",
      "Stacked decorators apply bottom-up; `__wrapped__` leads back down to the original.",
      "Next: context managers, the other way to put code around something: a block, with `with`.",
    ],
  },

  // ------------------------------------------------------------------ PY-L33-04 custom context managers
  {
    id: "PY-L33-04",
    version: 2,
    slug: "context-manager-classes",
    title: "Context managers: __enter__ and __exit__",
    lede: "A with block guarantees that cleanup runs: a file closes, a transaction ends, a setting is restored, even when the block raises. A class becomes a context manager by defining __enter__, which runs at the start, and __exit__, which always runs at the end and sees any exception.",
    focus: "Write classes with __enter__ and __exit__ that set something up, always undo it, and decide whether an exception is suppressed.",
    minutes: 22,
    objectives: [
      "Trace a `with` statement: `__enter__`, the block, then `__exit__(exc_type, exc, traceback)`",
      "Restore state in `__exit__` whether or not the block failed",
      "Suppress only chosen exceptions by returning True from `__exit__`",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "boolean", "class-def", "conditional-expr", "conversion", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "dict-update", "else-clause", "end", "except-type", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "lambda", "list-literal", "list-mutate", "logical", "membership", "method-def", "none-value", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "star-args", "string-format", "string-index", "top-level-indent", "truthiness", "try-except", "unquoted-name", "with-statement"],
    teaches: ["enter-method"],
    blocks: [
      {
        kind: "text",
        md: "You've used `with open(...)` (see Files & Directories) and `with conn:` (see Packaging & Databases). Both work through the **context-manager protocol**. `with manager as name:` calls `manager.__enter__()` and binds what it returns to `name`. Then the block runs. Then `manager.__exit__(exc_type, exc, traceback)` runs **no matter how the block ended**: normally (all three arguments are None), with an exception (they describe it), or through `return` or `break`. If `__exit__` returns True, an exception from the block is **suppressed**; otherwise it continues after cleanup.",
      },
      {
        kind: "example",
        title: "Change a setting for one block",
        code: src`
settings = {"currency": "USD", "timeout": 10}

class TempSetting:
    def __init__(self, settings, key, value):
        self.settings = settings
        self.key = key
        self.value = value

    def __enter__(self):
        self.old = self.settings[self.key]
        self.settings[self.key] = self.value
        return self.settings

    def __exit__(self, exc_type, exc, traceback):
        self.settings[self.key] = self.old
        return False

with TempSetting(settings, "currency", "EUR") as current:
    print("inside:", current["currency"])
print("after:", settings["currency"])

try:
    with TempSetting(settings, "timeout", 1):
        raise TimeoutError("the export took too long")
except TimeoutError as err:
    print("error:", err)
print("timeout restored:", settings["timeout"])
`,
        output: "inside: EUR\nafter: USD\nerror: the export took too long\ntimeout restored: 10\n",
        note: "`__exit__` restored the old value both times. It returned False, so the TimeoutError carried on to the `except` outside the block.",
      },
      {
        kind: "text",
        md: "`__exit__` receives the exception, so it can decide what happens to it. This collector suppresses only the error types it was given and keeps their messages, which lets an import continue past bad rows while every other kind of error still stops it.",
      },
      {
        kind: "example",
        title: "Collect chosen errors and carry on",
        code: src`
class Collect:
    def __init__(self, *types):
        self.types = types
        self.errors = []

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        if exc_type is not None and issubclass(exc_type, self.types):
            self.errors.append(f"{exc_type.__name__}: {exc}")
            return True
        return False

rows = ["4.7", "n/a", "5.5", ""]
magnitudes = []
collector = Collect(ValueError)
for row in rows:
    with collector:
        magnitudes.append(float(row))
print(magnitudes)
print(collector.errors)
`,
        output: "[4.7, 5.5]\n[\"ValueError: could not convert string to float: 'n/a'\", \"ValueError: could not convert string to float: ''\"]\n",
        note: "The same collector object is entered once per row. Its `__exit__` swallowed the two ValueErrors (returning True) and the loop went on. A KeyError would not be in `self.types`, so it would still stop the program.",
      },
      {
        kind: "text",
        md: "**When to use it:** anything that must be undone or closed: temporary settings, locks, working directories, timers, staged changes. **Mistakes to avoid:** doing the undo outside `__exit__` (it's skipped when the block raises); returning True from `__exit__` by accident, which hides every error; forgetting to `return self` (or the resource) from `__enter__` when the block uses `as`; and setting up in `__init__` work that belongs in `__enter__`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A setting that didn't exist",
      prompt: "`TempSetting` fails with KeyError when the key isn't in the settings yet. Change it so a missing key is added for the block and **removed** again afterwards.",
      spec: [
        ["Class", "`TempSetting(settings, key, value)`"],
        ["After the block", "the settings are exactly as before: an existing key gets its old value back, a new key is deleted"],
      ],
      starter: src`
class TempSetting:
    def __init__(self, settings, key, value):
        self.settings = settings
        self.key = key
        self.value = value

    def __enter__(self):
        self.old = self.settings[self.key]
        self.settings[self.key] = self.value
        return self.settings

    def __exit__(self, exc_type, exc, traceback):
        self.settings[self.key] = self.old
        return False

settings = {"currency": "USD"}
with TempSetting(settings, "debug", True) as current:
    print(current)
print(settings)
`,
      answer: src`
class TempSetting:
    def __init__(self, settings, key, value):
        self.settings = settings
        self.key = key
        self.value = value

    def __enter__(self):
        self.existed = self.key in self.settings
        self.old = self.settings.get(self.key)
        self.settings[self.key] = self.value
        return self.settings

    def __exit__(self, exc_type, exc, traceback):
        if self.existed:
            self.settings[self.key] = self.old
        else:
            del self.settings[self.key]
        return False

settings = {"currency": "USD"}
with TempSetting(settings, "debug", True) as current:
    print(current)
print(settings)
`,
      wrong: [
        {
          code: src`
class TempSetting:
    def __init__(self, settings, key, value):
        self.settings = settings
        self.key = key
        self.value = value

    def __enter__(self):
        self.old = self.settings.get(self.key)
        self.settings[self.key] = self.value
        return self.settings

    def __exit__(self, exc_type, exc, traceback):
        self.settings[self.key] = self.old
        return False
`,
          fails: ["returns"],
          why: "the new key is left behind with the value None",
        },
      ],
      hints: ["Remember in `__enter__` whether the key was there at all.", "`get` reads a key that may be missing without raising.", "In `__exit__`, either put the old value back or `del` the key."],
      task: {
        checks: [
          expr("returns", "a new key is removed afterwards", "_s = {'currency': 'USD'}\nwith TempSetting(_s, 'debug', True) as _c:\n    _inside = dict(_c)\nresult = (_inside, _s)", py.tuple(pv({ currency: "USD", debug: true }), pv({ currency: "USD" })), { show: "the settings inside and after the block" }),
          expr("existing", "an existing key gets its old value back, even after an error", "_s = {'timeout': 10}\ntry:\n    with TempSetting(_s, 'timeout', 1):\n        raise RuntimeError('x')\nexcept RuntimeError:\n    pass\nresult = _s", { timeout: 10 }, { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Time a block with an injected clock",
        prompt: "Write a context manager class `Stopwatch(clock)` for timing blocks of a report. `__enter__` reads the clock and returns the stopwatch; `__exit__` reads it again and stores the difference in `elapsed`, whether the block finished or raised. Exceptions are never suppressed. Each `with` (the same stopwatch can be reused) measures only its own block.",
        spec: [
          ["Class", "`Stopwatch(clock)`; `clock()` returns seconds (`time.perf_counter` in production)"],
          ["After the block", "`watch.elapsed` is the seconds the block took"],
          ["Exceptions", "always propagate"],
        ],
        starter: src`
import time

class Stopwatch:
    def __init__(self, clock=time.perf_counter):
        self.clock = clock
        self.elapsed = None

ticks = iter([10.0, 12.5])
with Stopwatch(lambda: next(ticks)) as watch:
    total = sum([40.8, 7.2, 17.2])
print(watch.elapsed)
`,
        answer: src`
import time

class Stopwatch:
    def __init__(self, clock=time.perf_counter):
        self.clock = clock
        self.elapsed = None

    def __enter__(self):
        self.started = self.clock()
        return self

    def __exit__(self, exc_type, exc, traceback):
        self.elapsed = self.clock() - self.started
        return False

ticks = iter([10.0, 12.5])
with Stopwatch(lambda: next(ticks)) as watch:
    total = sum([40.8, 7.2, 17.2])
print(watch.elapsed)
`,
        alternatives: [
          src`
import time

class Stopwatch:
    def __init__(self, clock=time.perf_counter):
        self.clock = clock
        self.elapsed = None
        self._start = None

    def __enter__(self):
        self._start = self.clock()
        return self

    def __exit__(self, *exc_info):
        end = self.clock()
        self.elapsed = end - self._start
`,
        ],
        wrong: [
          {
            code: src`
import time

class Stopwatch:
    def __init__(self, clock=time.perf_counter):
        self.clock = clock
        self.elapsed = None
        self.started = clock()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        self.elapsed = self.clock() - self.started
        return False
`,
            fails: ["reuse"],
            why: "the start time is read when the stopwatch is created, not when the block starts",
          },
          {
            code: src`
import time

class Stopwatch:
    def __init__(self, clock=time.perf_counter):
        self.clock = clock
        self.elapsed = None

    def __enter__(self):
        self.started = self.clock()
        return self

    def __exit__(self, exc_type, exc, traceback):
        self.elapsed = self.clock() - self.started
        return True
`,
            fails: ["propagates"],
            why: "returning True swallows every exception raised in the block",
          },
          {
            code: src`
import time

class Stopwatch:
    def __init__(self, clock=time.perf_counter):
        self.clock = clock
        self.elapsed = None

    def __enter__(self):
        self.started = self.clock()

    def __exit__(self, exc_type, exc, traceback):
        self.elapsed = self.clock() - self.started
        return False
`,
            fails: ["as-target"],
            why: "`__enter__` returns None, so `with Stopwatch() as watch` binds None",
          },
        ],
        hints: [
          "Read the clock in `__enter__` and keep the value on `self`; return `self`.",
          "In `__exit__`, read the clock again and store the difference in `elapsed`.",
          "Return False (or nothing) from `__exit__` so exceptions go on to the caller.",
        ],
        task: {
          checks: [
            expr("returns", "a block from 10.0 s to 12.5 s", "_t = iter([10.0, 12.5])\n_w = Stopwatch(lambda: next(_t))\nwith _w:\n    pass\nresult = _w.elapsed", 2.5, { show: "elapsed for a block that ran from 10.0 s to 12.5 s" }),
            expr("as-target", "`as` gives the stopwatch itself", "_t = iter([1.0, 1.25])\nwith Stopwatch(lambda: next(_t)) as _w:\n    pass\nresult = _w.elapsed", 0.25, { show: "with Stopwatch(clock) as watch: … ; watch.elapsed" }),
            expr("propagates", "an error in the block still reaches the caller, and the time is recorded", "_t = iter([5.0, 9.0])\n_w = Stopwatch(lambda: next(_t))\ntry:\n    with _w:\n        raise ValueError('bad row')\n    result = 'swallowed'\nexcept ValueError:\n    result = _w.elapsed", py.float(4), { hidden: true }),
            expr("reuse", "the same stopwatch used twice measures each block", "_t = iter([0.0, 3.0, 100.0, 101.5])\n_w = Stopwatch(lambda: next(_t))\nwith _w:\n    pass\n_first = _w.elapsed\nwith _w:\n    pass\nresult = (_first, _w.elapsed)", py.tuple(py.float(3), py.float(1.5)), { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Stage changes, apply them all or none",
        prompt: "Config edits should land together or not at all (like a transaction, the Packaging & Databases module). Write a context manager class `Staged(config)`: `__enter__` returns a **copy** of the dictionary to edit; when the block finishes normally, the original dictionary is updated to match the copy exactly (changed, added and deleted keys); when the block raises, the original is left untouched and the exception propagates.",
        spec: [
          ["Class", "`Staged(config)`"],
          ["Inside", "`with Staged(config) as draft:` edits `draft`, never `config`"],
          ["On success", "`config` ends up equal to `draft`, and is still the same dictionary object"],
          ["On error", "`config` unchanged; the exception continues"],
        ],
        starter: src`
class Staged:
    def __init__(self, config):
        self.config = config

config = {"currency": "USD", "top_n": 10, "send_email": False}
with Staged(config) as draft:
    draft["top_n"] = 5
    del draft["send_email"]
print(config)
`,
        answer: src`
class Staged:
    def __init__(self, config):
        self.config = config

    def __enter__(self):
        self.draft = dict(self.config)
        return self.draft

    def __exit__(self, exc_type, exc, traceback):
        if exc_type is None:
            self.config.clear()
            self.config.update(self.draft)
        return False

config = {"currency": "USD", "top_n": 10, "send_email": False}
with Staged(config) as draft:
    draft["top_n"] = 5
    del draft["send_email"]
print(config)
`,
        alternatives: [
          src`
class Staged:
    def __init__(self, config):
        self.config = config

    def __enter__(self):
        self.draft = {key: value for key, value in self.config.items()}
        return self.draft

    def __exit__(self, exc_type, exc, traceback):
        if exc_type is not None:
            return False
        for key in list(self.config):
            if key not in self.draft:
                del self.config[key]
        for key, value in self.draft.items():
            self.config[key] = value
        return False
`,
        ],
        wrong: [
          {
            code: src`
class Staged:
    def __init__(self, config):
        self.config = config

    def __enter__(self):
        return self.config

    def __exit__(self, exc_type, exc, traceback):
        return False
`,
            fails: ["draft-is-copy", "error-untouched"],
            why: "the block edits the real dictionary, so a failed block leaves half its edits behind",
          },
          {
            code: src`
class Staged:
    def __init__(self, config):
        self.config = config

    def __enter__(self):
        self.draft = dict(self.config)
        return self.draft

    def __exit__(self, exc_type, exc, traceback):
        if exc_type is None:
            self.config.update(self.draft)
        return False
`,
            fails: ["returns"],
            why: "`update` adds and changes keys but never removes deleted ones",
          },
          {
            code: src`
class Staged:
    def __init__(self, config):
        self.config = config

    def __enter__(self):
        self.draft = dict(self.config)
        return self.draft

    def __exit__(self, exc_type, exc, traceback):
        if exc_type is None:
            self.config.clear()
            self.config.update(self.draft)
        return True
`,
            fails: ["propagates"],
            why: "returning True hides the error, so the caller thinks the edit succeeded",
          },
        ],
        hints: [
          "`__enter__` makes the copy, keeps it on `self` and returns it.",
          "`__exit__` checks `exc_type`: None means the block finished normally.",
          "To make the original match the copy while keeping it the same object, empty it and then fill it from the draft; let any error carry on to the caller.",
        ],
        task: {
          checks: [
            expr("returns", "edits, additions and deletions all land", "_c = {'currency': 'USD', 'top_n': 10, 'send_email': False}\n_same = _c\nwith Staged(_c) as _d:\n    _d['top_n'] = 5\n    _d['output_dir'] = 'reports'\n    del _d['send_email']\nresult = (_c, _c is _same)", py.tuple(pv({ currency: "USD", top_n: 5, output_dir: "reports" }), py.bool(true)), { show: "config after a block that changes, adds and deletes keys" }),
            expr("draft-is-copy", "inside the block, the original is untouched", "_c = {'top_n': 10}\nwith Staged(_c) as _d:\n    _d['top_n'] = 3\n    _inside = dict(_c)\nresult = _inside", { top_n: 10 }, { show: "config inside the block, after draft['top_n'] = 3" }),
            expr("error-untouched", "a block that fails leaves the original untouched", "_c = {'currency': 'USD', 'top_n': 10}\ntry:\n    with Staged(_c) as _d:\n        _d['top_n'] = 0\n        raise ValueError('top_n must be positive')\nexcept ValueError:\n    pass\nresult = _c", { currency: "USD", top_n: 10 }, { hidden: true }),
            expr("propagates", "the error reaches the caller", "_c = {'a': 1}\ntry:\n    with Staged(_c) as _d:\n        raise KeyError('a')\n    result = 'swallowed'\nexcept KeyError:\n    result = 'raised'", "raised", { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
class Trace:
    def __enter__(self):
        print("enter")
        return "resource"

    def __exit__(self, exc_type, exc, traceback):
        print("exit", exc_type.__name__ if exc_type else None)
        return exc_type is KeyError

with Trace() as r:
    print("using", r)
with Trace():
    raise KeyError("missing")
print("done")
`,
        choices: ["enter\nusing resource\nexit None\nenter\nexit KeyError\ndone", "enter\nusing resource\nexit None\nenter\nexit KeyError", "enter\nusing Trace\nexit None\nenter\nexit KeyError\ndone", "enter\nusing resource\nenter\nexit KeyError\ndone"],
        answer: 0,
        why: "`as` binds what `__enter__` returned. `__exit__` runs after both blocks; for the KeyError it returns True, so the exception is suppressed and `done` prints.",
      },
      {
        id: "q2",
        prompt: "A common mistake: cleanup written after the block instead of in `__exit__`. What does this print?",
        program: src`
settings = {"currency": "USD"}

def run_report():
    raise RuntimeError("export failed")

try:
    old = settings["currency"]
    settings["currency"] = "EUR"
    run_report()
    settings["currency"] = old
except RuntimeError:
    pass
print(settings["currency"])
`,
        choices: ["EUR", "USD", "RuntimeError", "None"],
        answer: 0,
        why: "The restore line never runs because `run_report` raised first. Putting the restore in a context manager's `__exit__` (or a `finally`) makes it run either way.",
      },
      {
        id: "q3",
        prompt: "When should `__exit__` return True?",
        choices: [
          "Only when the manager's job is to handle that kind of exception, as in a collector of expected errors",
          "Always, so the program never crashes",
          "Whenever the cleanup succeeded",
          "When `exc_type` is None",
        ],
        answer: 0,
        why: "True means \"I handled it, carry on\". Returning it for every exception hides bugs. When there was no exception the return value doesn't matter.",
      },
    ],
    review: [
      "`with m as x:` calls `m.__enter__()` (its result is `x`), runs the block, then always calls `m.__exit__`.",
      "Undo work in `__exit__`, which receives the exception type, value and traceback (all None on success).",
      "Return True from `__exit__` only to suppress exceptions the manager is meant to handle.",
      "Next: `contextlib`, which writes context managers as generators and adds ready-made ones.",
    ],
  },

  // ------------------------------------------------------------------ PY-L33-05 contextlib
  {
    id: "PY-L33-05",
    version: 2,
    slug: "contextlib-tools",
    title: "contextlib: context managers from generators",
    lede: "contextlib.contextmanager turns a generator with one yield into a context manager: setup before the yield, cleanup after it in a finally. contextlib also ships ready-made managers: suppress, redirect_stdout, and ExitStack for a varying number of resources.",
    focus: "Write context managers with @contextmanager and try/finally, and use suppress, redirect_stdout and ExitStack.",
    minutes: 22,
    objectives: [
      "Write a `@contextmanager` generator whose cleanup is in `finally`",
      "Use `contextlib.suppress` and `redirect_stdout` instead of writing a class",
      "Open a variable number of files safely with `ExitStack`",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comparison", "decorator-at", "dict-literal", "dict-lookup", "else-clause", "encoding-arg", "except-type", "file-open", "finally-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-loop", "newline-escape", "none-value", "path-call", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "string-format", "string-index", "string-method", "string-slice", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "unquoted-name", "with-statement", "yield-expr", "zip-call"],
    teaches: ["context-dec"],
    blocks: [
      {
        kind: "text",
        md: "A class with `__enter__` and `__exit__` is a lot of code for \"do this before, undo it after\". **`contextlib.contextmanager`** builds the class for you from a generator function: the code before `yield` is the enter part, the yielded value is what `as` binds, and the code after `yield` is the exit part. If the block raises, the exception is raised **at the `yield`**, so the cleanup must be in a `finally` to run in that case.",
      },
      {
        kind: "example",
        title: "A timing block from a generator",
        code: src`
from contextlib import contextmanager

@contextmanager
def timed(label, clock, results):
    start = clock()
    try:
        yield
    finally:
        results[label] = clock() - start

ticks = iter([0.0, 1.5, 2.0, 2.25])
results = {}
with timed("download", lambda: next(ticks), results):
    pass
try:
    with timed("parse", lambda: next(ticks), results):
        raise ValueError("bad row 812")
except ValueError as err:
    print("error:", err)
print(results)
`,
        output: "error: bad row 812\n{'download': 1.5, 'parse': 0.25}\n",
        note: "The `finally` stored the parse time even though the block failed; the error then continued to the caller. Without `try`/`finally` the line after `yield` would be skipped on an error. The clock is passed in, so the times here are exact; real code uses `time.perf_counter`.",
      },
      {
        kind: "text",
        md: "`contextlib` also has managers you don't need to write:\n\n- `suppress(FileNotFoundError)` ignores exactly those exceptions in its block;\n- `redirect_stdout(buffer)` sends everything printed in the block to `buffer`, for example an `io.StringIO`, which is how you capture a noisy function's output;\n- `ExitStack()` enters any number of context managers, chosen while the program runs, and exits all of them (in reverse order) when its own block ends: one `with` for a list of files.",
      },
      {
        kind: "example",
        title: "suppress, redirect_stdout and ExitStack",
        code: src`
import io
import os
from contextlib import ExitStack, redirect_stdout, suppress
from pathlib import Path

for name, text in [("ord.csv", "date,tmax_c\n2024-07-01,31.7\n"), ("lax.csv", "date,tmax_c\n2024-07-01,24.4\n")]:
    with open(name, "w", encoding="utf-8") as f:
        f.write(text)

with suppress(FileNotFoundError):
    os.remove("old-report.txt")
print("no old report, no problem")

def noisy_import():
    print("reading ord.csv")
    print("reading lax.csv")
    return 2

buffer = io.StringIO()
with redirect_stdout(buffer):
    count = noisy_import()
print(count, buffer.getvalue().splitlines())

paths = ["ord.csv", "lax.csv"]
with ExitStack() as stack:
    files = [stack.enter_context(Path(p).open(encoding="utf-8")) for p in paths]
    headers = [f.readline().strip() for f in files]
print(headers, [f.closed for f in files])
`,
        output: "no old report, no problem\n2 ['reading ord.csv', 'reading lax.csv']\n['date,tmax_c', 'date,tmax_c'] [True, True]\n",
        note: "`os.remove` raised FileNotFoundError and `suppress` absorbed it, and only it. The prints went into the buffer instead of the screen. Both files were open inside the `ExitStack` block and both were closed when it ended.",
      },
      {
        kind: "text",
        md: "**When to use it:** `@contextmanager` for short setup/cleanup pairs; the ready-made managers wherever they fit; a class when the manager has several methods or lots of state. **Mistakes to avoid:** cleanup after `yield` without `finally`; yielding more than once (a context manager's generator must yield exactly once); wide `suppress(Exception)`, which hides bugs; and opening files in a loop without `ExitStack`, which leaves the earlier ones open if a later one fails.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Restore even on failure",
      prompt: "`working_directory` changes the current folder for a block and changes back afterwards, but when the block raises, the program stays in the wrong folder. Put the `yield` in a `try` and the change back in its `finally`.",
      spec: [
        ["Context manager", "`working_directory(path)` from `@contextmanager`"],
        ["After the block", "the current directory is the one from before, even when the block raised"],
      ],
      starter: src`
import os
from contextlib import contextmanager

@contextmanager
def working_directory(path):
    previous = os.getcwd()
    os.chdir(path)
    yield path
    os.chdir(previous)

os.makedirs("reports", exist_ok=True)
start = os.getcwd()
try:
    with working_directory("reports"):
        raise RuntimeError("export failed")
except RuntimeError:
    pass
print(os.getcwd() == start)
`,
      answer: src`
import os
from contextlib import contextmanager

@contextmanager
def working_directory(path):
    previous = os.getcwd()
    os.chdir(path)
    try:
        yield path
    finally:
        os.chdir(previous)

os.makedirs("reports", exist_ok=True)
start = os.getcwd()
try:
    with working_directory("reports"):
        raise RuntimeError("export failed")
except RuntimeError:
    pass
print(os.getcwd() == start)
`,
      wrong: [
        {
          code: src`
import os
from contextlib import contextmanager

@contextmanager
def working_directory(path):
    previous = os.getcwd()
    os.chdir(path)
    try:
        yield path
    except RuntimeError:
        pass
    os.chdir(previous)
`,
          fails: ["propagates"],
          why: "catching the error restores the folder but swallows the error",
        },
      ],
      hints: ["The line after `yield` is skipped when the block raises.", "`finally` runs whether or not an exception passed through.", "Wrap `yield path` in `try:` and move the change back into `finally:`."],
      task: {
        checks: [
          expr("returns", "the folder is restored after a failing block", "import os as _os\n_os.makedirs('r1', exist_ok=True)\n_start = _os.getcwd()\ntry:\n    with working_directory('r1'):\n        raise RuntimeError('x')\nexcept RuntimeError:\n    pass\nresult = _os.getcwd() == _start", true, { show: "os.getcwd() == start after a block that raised" }),
          expr("propagates", "the error still reaches the caller", "import os as _os\n_os.makedirs('r2', exist_ok=True)\n_start = _os.getcwd()\ntry:\n    with working_directory('r2'):\n        raise RuntimeError('x')\n    result = 'swallowed'\nexcept RuntimeError:\n    result = 'raised'\n_os.chdir(_start)", "raised", { hidden: true }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Write a file all at once or not at all",
        prompt: "A report file that is half written when the program crashes is worse than no new file. Write `atomic_write(path)` with `@contextmanager`: it yields a file object opened for writing text to `path + \".tmp\"`. If the block finishes, close the file and replace `path` with it (`os.replace`). If the block raises, close and delete the temporary file, leave any existing `path` untouched, and let the exception continue.",
        spec: [
          ["Context manager", "`atomic_write(path)`, yields a text file (UTF-8) to write to"],
          ["Success", "`path` has the new content; no `.tmp` file is left"],
          ["Failure", "`path` keeps its old content (or still doesn't exist); no `.tmp` file is left; the error propagates"],
        ],
        starter: src`
import os
from contextlib import contextmanager

@contextmanager
def atomic_write(path):
    with open(path, "w", encoding="utf-8") as f:
        yield f

with atomic_write("summary.txt") as out:
    out.write("12855 events\n")
with open("summary.txt", encoding="utf-8") as check:
    print(check.read(), os.path.exists("summary.txt.tmp"))
`,
        answer: src`
import os
from contextlib import contextmanager

@contextmanager
def atomic_write(path):
    temporary = path + ".tmp"
    try:
        with open(temporary, "w", encoding="utf-8") as f:
            yield f
    except BaseException:
        os.remove(temporary)
        raise
    os.replace(temporary, path)

with atomic_write("summary.txt") as out:
    out.write("12855 events\n")
with open("summary.txt", encoding="utf-8") as check:
    print(check.read(), os.path.exists("summary.txt.tmp"))
`,
        alternatives: [
          src`
import os
from contextlib import contextmanager

@contextmanager
def atomic_write(path):
    tmp = path + ".tmp"
    ok = False
    try:
        with open(tmp, "w", encoding="utf-8") as f:
            yield f
        ok = True
    finally:
        if ok:
            os.replace(tmp, path)
        elif os.path.exists(tmp):
            os.remove(tmp)
`,
        ],
        wrong: [
          {
            code: src`
import os
from contextlib import contextmanager

@contextmanager
def atomic_write(path):
    with open(path, "w", encoding="utf-8") as f:
        yield f
`,
            fails: ["keeps-old", "no-tmp-left"],
            why: "it writes straight into the real file, so a failure leaves it half written",
          },
          {
            code: src`
import os
from contextlib import contextmanager

@contextmanager
def atomic_write(path):
    temporary = path + ".tmp"
    with open(temporary, "w", encoding="utf-8") as f:
        yield f
    os.replace(temporary, path)
`,
            fails: ["no-tmp-left"],
            why: "on failure the temporary file is left lying around",
          },
          {
            code: src`
import os
from contextlib import contextmanager

@contextmanager
def atomic_write(path):
    temporary = path + ".tmp"
    f = open(temporary, "w", encoding="utf-8")
    try:
        yield f
    except Exception:
        f.close()
        os.remove(temporary)
        return
    f.close()
    os.replace(temporary, path)
`,
            fails: ["propagates"],
            why: "returning inside `except` swallows the error, so the caller never learns the write failed",
          },
        ],
        hints: [
          "Write to `path + \".tmp\"` and only move it into place at the end: `os.replace` swaps it in one step.",
          "Open the temporary file in a `with` block around the `yield`, so it is closed however the block ends.",
          "Put that `with` inside a `try`: on an exception, remove the temporary file and `raise` again; after a block that finished, replace the real file.",
        ],
        task: {
          checks: [
            expr("returns", "a finished block writes the file and leaves no .tmp", "import os as _os\nwith atomic_write('a1.txt') as _f:\n    _f.write('12855 events\\n')\nwith open('a1.txt', encoding='utf-8') as _r:\n    result = (_r.read(), _os.path.exists('a1.txt.tmp'))", py.tuple(py.str("12855 events\n"), py.bool(false)), { show: "the file and whether a .tmp file is left, after a finished block" }),
            expr("keeps-old", "a failed block leaves the old content", "with open('a2.txt', 'w', encoding='utf-8') as _w:\n    _w.write('old report\\n')\ntry:\n    with atomic_write('a2.txt') as _f:\n        _f.write('half')\n        raise ValueError('bad data')\nexcept ValueError:\n    pass\nwith open('a2.txt', encoding='utf-8') as _r:\n    result = _r.read()", "old report\n", { show: "the file's content after a block that raised" }),
            expr("no-tmp-left", "a failed block leaves no .tmp file", "import os as _os\ntry:\n    with atomic_write('a3.txt') as _f:\n        raise ValueError('x')\nexcept ValueError:\n    pass\nresult = (_os.path.exists('a3.txt.tmp'), _os.path.exists('a3.txt'))", py.tuple(py.bool(false), py.bool(false)), { hidden: true }),
            expr("propagates", "the error reaches the caller", "try:\n    with atomic_write('a4.txt') as _f:\n        raise KeyError('k')\n    result = 'swallowed'\nexcept KeyError:\n    result = 'raised'", "raised", { hidden: true }),
          ],
        },
      },
      {
        id: "c2",
        title: "Combine station files",
        prompt: "Write `combine_csv(paths, out_path)`: open every input CSV at once with `ExitStack` (the list's length varies), check that all of them have the same header line, and write the header once followed by every data line, file by file in order. Return the number of data lines written. If a header differs, raise `ValueError` naming that file, and don't create `out_path`. All input files must be closed when the function returns or raises.",
        spec: [
          ["Function", "`combine_csv(paths, out_path)`"],
          ["Returns", "the number of data lines written"],
          ["Raises", "`ValueError(\"lax.csv: header differs\")` before anything is written"],
          ["Closed", "every input file is closed afterwards, success or not"],
        ],
        starter: src`
from contextlib import ExitStack

def combine_csv(paths, out_path):
    return 0

for name, text in [("ord.csv", "station,date,tmax_c\nUSW00094846,2024-07-01,31.7\n"), ("lax.csv", "station,date,tmax_c\nUSW00023174,2024-07-01,24.4\nUSW00023174,2024-07-02,25.0\n")]:
    with open(name, "w", encoding="utf-8") as f:
        f.write(text)
print(combine_csv(["ord.csv", "lax.csv"], "all.csv"))
`,
        answer: src`
from contextlib import ExitStack
from pathlib import Path

def combine_csv(paths, out_path):
    with ExitStack() as stack:
        files = [stack.enter_context(Path(p).open(encoding="utf-8")) for p in paths]
        headers = [f.readline() for f in files]
        for path, header in zip(paths, headers):
            if header != headers[0]:
                raise ValueError(f"{path}: header differs")
        written = 0
        with open(out_path, "w", encoding="utf-8") as out:
            if headers:
                out.write(headers[0])
            for f in files:
                for line in f:
                    out.write(line)
                    written += 1
    return written

for name, text in [("ord.csv", "station,date,tmax_c\nUSW00094846,2024-07-01,31.7\n"), ("lax.csv", "station,date,tmax_c\nUSW00023174,2024-07-01,24.4\nUSW00023174,2024-07-02,25.0\n")]:
    with open(name, "w", encoding="utf-8") as f:
        f.write(text)
print(combine_csv(["ord.csv", "lax.csv"], "all.csv"))
`,
        alternatives: [
          src`
import contextlib
from pathlib import Path

def combine_csv(paths, out_path):
    with contextlib.ExitStack() as stack:
        handles = []
        for p in paths:
            handles.append(stack.enter_context(Path(p).open(encoding="utf-8")))
        first = None
        bodies = []
        for p, h in zip(paths, handles):
            lines = h.read().splitlines(keepends=True)
            header, body = lines[0], lines[1:]
            if first is None:
                first = header
            elif header != first:
                raise ValueError(p + ": header differs")
            bodies.append(body)
        with open(out_path, "w", encoding="utf-8") as out:
            out.write(first or "")
            count = 0
            for body in bodies:
                out.writelines(body)
                count += len(body)
    return count
`,
        ],
        wrong: [
          {
            code: src`
from contextlib import ExitStack

def combine_csv(paths, out_path):
    written = 0
    with open(out_path, "w", encoding="utf-8") as out:
        header = None
        for p in paths:
            with open(p, encoding="utf-8") as f:
                first = f.readline()
                if header is None:
                    header = first
                    out.write(first)
                elif first != header:
                    raise ValueError(f"{p}: header differs")
                for line in f:
                    out.write(line)
                    written += 1
    return written
`,
            fails: ["no-output"],
            why: "it starts writing before checking every header, so a mismatch leaves a half-built output file",
          },
          {
            code: src`
from contextlib import ExitStack

def combine_csv(paths, out_path):
    files = [open(p, encoding="utf-8") for p in paths]
    headers = [f.readline() for f in files]
    for path, header in zip(paths, headers):
        if header != headers[0]:
            raise ValueError(f"{path}: header differs")
    written = 0
    with open(out_path, "w", encoding="utf-8") as out:
        out.write(headers[0])
        for f in files:
            for line in f:
                out.write(line)
                written += 1
    for f in files:
        f.close()
    return written
`,
            fails: ["closed"],
            why: "when a header differs, the function raises before it closes the input files",
          },
          {
            code: src`
from contextlib import ExitStack

def combine_csv(paths, out_path):
    with ExitStack() as stack:
        files = [stack.enter_context(open(p, encoding="utf-8")) for p in paths]
        written = 0
        with open(out_path, "w", encoding="utf-8") as out:
            for f in files:
                for line in f:
                    out.write(line)
                    written += 1
    return written
`,
            fails: ["returns", "content", "no-output"],
            why: "every file's header is copied as data, and mismatched headers aren't noticed",
          },
        ],
        hints: [
          "Enter each opened file (`Path(p).open(...)` or `open(...)`) into the `ExitStack` with `stack.enter_context`; they all close when the `with ExitStack()` block ends, even on an error.",
          "Read every header first and compare them before opening the output file.",
          "Write the shared header once, then the remaining lines of each file in order, counting them.",
        ],
        task: {
          checks: [
            expr("returns", "three data lines from two files", "for _n, _t in [('o1.csv', 'station,date,tmax_c\\nUSW00094846,2024-07-01,31.7\\n'), ('l1.csv', 'station,date,tmax_c\\nUSW00023174,2024-07-01,24.4\\nUSW00023174,2024-07-02,25.0\\n')]:\n    with open(_n, 'w', encoding='utf-8') as _w:\n        _w.write(_t)\nresult = combine_csv(['o1.csv', 'l1.csv'], 'all1.csv')", 3, { show: "combine_csv(['ord.csv', 'lax.csv'], 'all.csv')" }),
            expr("content", "the combined file has one header and every row", "for _n, _t in [('o2.csv', 'station,date,tmax_c\\nA,1,2\\n'), ('l2.csv', 'station,date,tmax_c\\nB,3,4\\n')]:\n    with open(_n, 'w', encoding='utf-8') as _w:\n        _w.write(_t)\ncombine_csv(['o2.csv', 'l2.csv'], 'all2.csv')\nwith open('all2.csv', encoding='utf-8') as _r:\n    result = _r.read()", "station,date,tmax_c\nA,1,2\nB,3,4\n", { show: "the text of the combined file" }),
            expr("no-output", "a differing header raises and creates no output", "import os as _os\nfor _n, _t in [('o3.csv', 'station,date,tmax_c\\nA,1,2\\n'), ('l3.csv', 'station,day,tmax_c\\nB,3,4\\n')]:\n    with open(_n, 'w', encoding='utf-8') as _w:\n        _w.write(_t)\ntry:\n    combine_csv(['o3.csv', 'l3.csv'], 'all3.csv')\n    result = 'no error'\nexcept ValueError as _e:\n    result = (str(_e), _os.path.exists('all3.csv'))", py.tuple(py.str("l3.csv: header differs"), py.bool(false)), { hidden: true }),
            expr("closed", "input files are closed after an error", "import builtins as _b, io as _io\n_opened = []\n_real_open = _b.open\ndef _spy_open(*a, **k):\n    _f = _real_open(*a, **k)\n    _opened.append(_f)\n    return _f\nfor _n, _t in [('o4.csv', 'h1\\nx\\n'), ('l4.csv', 'h2\\ny\\n')]:\n    with open(_n, 'w', encoding='utf-8') as _w:\n        _w.write(_t)\n_b.open = _spy_open\n_io.open = _spy_open\ntry:\n    combine_csv(['o4.csv', 'l4.csv'], 'all4.csv')\nexcept ValueError:\n    pass\nfinally:\n    _b.open = _real_open\n    _io.open = _real_open\nresult = len(_opened) >= 2 and all([_f.closed for _f in _opened])", true, { hidden: true }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
from contextlib import contextmanager

@contextmanager
def section(name):
    print("open", name)
    try:
        yield name.upper()
    finally:
        print("close", name)

with section("totals") as title:
    print("writing", title)
print("after")
`,
        choices: ["open totals\nwriting TOTALS\nclose totals\nafter", "open totals\nwriting totals\nclose totals\nafter", "open totals\nclose totals\nwriting TOTALS\nafter", "writing TOTALS\nopen totals\nclose totals\nafter"],
        answer: 0,
        why: "The code before `yield` runs at the start of the block, the yielded value is bound by `as`, and the `finally` runs when the block ends.",
      },
      {
        id: "q2",
        prompt: "A common mistake: cleanup after `yield` without `finally`. What does this print?",
        program: src`
from contextlib import contextmanager

state = {"locked": False}

@contextmanager
def locked():
    state["locked"] = True
    yield
    state["locked"] = False

try:
    with locked():
        raise ValueError("bad input")
except ValueError:
    pass
print(state["locked"])
`,
        choices: ["True", "False", "ValueError", "None"],
        answer: 0,
        why: "The ValueError is raised at the `yield`, so the line after it never runs and the lock is never released. `try: yield` / `finally:` fixes it.",
      },
      {
        id: "q3",
        prompt: "A report must read a list of station files whose length is only known while the program runs. Which tool keeps them all open together and closes every one, even if opening the fifth fails?",
        choices: ["`contextlib.ExitStack`", "`contextlib.suppress`", "`contextlib.redirect_stdout`", "Nested `with` statements written out by hand"],
        answer: 0,
        why: "`ExitStack` enters any number of context managers at run time and exits all those it entered. Nested `with` statements need the number of files when you write the code.",
      },
    ],
    review: [
      "`@contextmanager`: setup, then `try: yield value` and cleanup in `finally:`.",
      "Exceptions from the block are raised at the `yield`; re-raise them unless handling them is the manager's job.",
      "`suppress`, `redirect_stdout` and `ExitStack` cover common needs without writing a manager.",
      "Next (see Functional & Dynamic Python): functions as building blocks: pure functions, `partial`, composition, introspection and registries.",
    ],
  },
];
