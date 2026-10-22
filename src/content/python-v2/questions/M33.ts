/**
 * M33 practice: ten independent problems on decorators and context managers (PY-L33-01 … PY-L33-05).
 *
 * Mix: 3 function implementations (decorators applied to given functions: case-insensitive arguments, argument
 * converters, normalised keys), 2 integration (capturing a function's output with redirect_stdout; temporary
 * environment variables), 2 debugging (a transaction context manager that swallows errors and restores too little;
 * a command table broken by wrappers without wraps), 1 testing (tests for a retry decorator) and 2 output predictions.
 * Easy: 02, 06, 10. Medium: 12, 13, 16, 19, 20. Hard: 03, 22.
 *
 * Decorators are graded by calling the decorated functions with hidden inputs and by applying the learner's decorator
 * to other functions; context managers by entering them with and without exceptions. Fixtures: USGS earthquakes (D08),
 * repository events (D11), Runtime Market prices.
 * Version 2: every question was replaced; the old set completed one-line decorator programs.
 */
import type { PyQuestion } from "../model";
import type { PyCheck } from "@/engine/python/grading";
import { example, fn, hiddenCase, learnerTests, pv, raisesCase } from "../checks";
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
const hideDefects = (checks: PyCheck[]) => checks.map((c) => (c.id && /-\d+$/.test(c.id) ? { ...c, hidden: true } : c));

const RETRY_PY = src`
import functools

def retry_on(*exceptions, attempts=3, sleep=None):
    """Retry the decorated function on the given exceptions, waiting 1, 2, 4, ... seconds."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            wait = 1
            for attempt in range(1, attempts + 1):
                try:
                    return func(*args, **kwargs)
                except exceptions:
                    if attempt == attempts:
                        raise
                    if sleep is not None:
                        sleep(wait)
                    wait *= 2
        return wrapper
    return decorator
`;

export const m33Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ PY-Q33-02 output prediction, easy
  {
    id: "PY-Q33-02",
    version: 2,
    slug: "predict-decorating-and-calling",
    title: "Predict: decorating time and calling time",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 8,
    prompt: "Two decorators are stacked, and only one of them uses `functools.wraps`. Predict exactly what this program prints.",
    requires: ["arithmetic", "assignment", "decorator-at", "function-def", "function-default", "function-param", "function-return", "import-module", "print-call", "print-several", "print-text", "reassignment", "star-args", "star-kwargs", "top-level-indent", "wraps-dec"],
    spec: [
      ["Watch", "when each decorator runs, which wrapper `announce` receives, and what `__name__` ends up as"],
    ],
    hiddenKinds: [],
    hints: [
      "Decorators apply bottom-up when the `def` runs: `double` first, then `announce` gets whatever `double` returned.",
      "`double` doesn't use `wraps`, so the function `announce` receives is named `wrapper`.",
      "Calling `fare` runs `announce`'s wrapper, which calls `double`'s wrapper, which calls the original.",
    ],
    explanation: "`@announce @double def fare` means `fare = announce(double(fare))`. `double` has no `wraps`, so it returns a function called `wrapper`, and that's the name `announce` prints both when decorating and when calling; `wraps` in `announce` then copies that name, so `fare.__name__` is `wrapper` too. The arguments pass through unchanged as a tuple and a dictionary, and the result is (10 + 2) × 2 = 24.",
    predict: {
      program: src`
import functools

def announce(func):
    print("decorating", func.__name__)
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print("calling", func.__name__, args, kwargs)
        return func(*args, **kwargs)
    return wrapper

def double(func):
    def wrapper(*args, **kwargs):
        return 2 * func(*args, **kwargs)
    return wrapper

@announce
@double
def fare(base, tip=0):
    return base + tip

print("defined")
print(fare(10, tip=2))
print(fare.__name__)
`,
      output: "decorating wrapper\ndefined\ncalling wrapper (10,) {'tip': 2}\n24\nwrapper\n",
      wrongPredictions: [
        "decorating fare\ndefined\ncalling fare (10,) {'tip': 2}\n24\nfare\n",
        "defined\ndecorating wrapper\ncalling wrapper (10,) {'tip': 2}\n24\nwrapper\n",
        "decorating wrapper\ndefined\ncalling wrapper (10,) {'tip': 2}\n14\nwrapper\n",
      ],
    },
  },

  // ------------------------------------------------------------------ PY-Q33-03 debugging, hard
  {
    id: "PY-Q33-03",
    version: 2,
    slug: "transaction-that-hides-errors",
    title: "The transaction that hides its failures",
    format: "debugging",
    difficulty: "hard",
    minutes: 18,
    requires: ["assignment", "boolean", "context-dec", "decorator-at", "dict-comp", "dict-iterate", "dict-literal", "dict-lookup", "except-type", "finally-clause", "function-def", "function-param", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-comp", "print-call", "print-several", "print-text", "raise-stmt", "reassignment", "string-index", "string-slice", "top-level-indent", "try-except", "unquoted-name", "with-statement", "yield-expr"],
    prompt: "`transaction(ledger)` should make a block of edits to a list of ledger entries all-or-nothing: on an error, the ledger goes back exactly to how it was and the error reaches the caller. Two bugs: callers never see the errors, and after a failed block some entries still have the new amounts. Fix both.",
    spec: [
      ["Context manager", "`transaction(ledger)` from `@contextmanager`; yields the ledger (a list of entry dictionaries)"],
      ["On error", "the ledger has the same entries with the same values as before; the exception propagates"],
      ["On success", "the edits stay"],
    ],
    hiddenKinds: ["an entry changed in place before the error", "entries added and removed before the error", "an error that isn't an Exception subclass the code expects"],
    hints: [
      "Make a block fail on purpose and check two things: does the error reach you, and what do the entries look like afterwards?",
      "An `except` that doesn't re-raise ends the exception there. After restoring, it needs a bare `raise`.",
      "`list(ledger)` copies the list but not the dictionaries in it, so an entry changed in place is changed in the copy too. Copy each entry (`dict(entry)`).",
    ],
    explanation: "Two separate bugs. The `except` block restored the list but never re-raised, so `@contextmanager` treated the exception as handled and the caller saw success. And `list(ledger)` is a shallow copy: it holds the same dictionaries, so `entry[\"amount\"] = …` inside the block changed the snapshot as well, and restoring put the changed entries back. Copying every entry (and re-raising) makes the rollback complete.",
    code: {
      starter: src`
from contextlib import contextmanager

@contextmanager
def transaction(ledger):
    snapshot = list(ledger)
    try:
        yield ledger
    except Exception:
        ledger[:] = snapshot

ledger = [{"order_id": "O100282", "amount": 35.84}, {"order_id": "O101219", "amount": 246.6}]
try:
    with transaction(ledger) as entries:
        entries[0]["amount"] = 0
        entries.append({"order_id": "O999999", "amount": -5})
        raise ValueError("refund larger than the order")
except ValueError as err:
    print("refused:", err)
print(ledger)
`,
      answer: src`
from contextlib import contextmanager

@contextmanager
def transaction(ledger):
    snapshot = [dict(entry) for entry in ledger]
    try:
        yield ledger
    except BaseException:
        ledger[:] = snapshot
        raise

ledger = [{"order_id": "O100282", "amount": 35.84}, {"order_id": "O101219", "amount": 246.6}]
try:
    with transaction(ledger) as entries:
        entries[0]["amount"] = 0
        entries.append({"order_id": "O999999", "amount": -5})
        raise ValueError("refund larger than the order")
except ValueError as err:
    print("refused:", err)
print(ledger)
`,
      alternatives: [
        src`
from contextlib import contextmanager

@contextmanager
def transaction(ledger):
    saved = [{key: value for key, value in entry.items()} for entry in ledger]
    ok = False
    try:
        yield ledger
        ok = True
    finally:
        if not ok:
            ledger.clear()
            ledger.extend(saved)
`,
      ],
      wrong: [
        {
          code: src`
from contextlib import contextmanager

@contextmanager
def transaction(ledger):
    snapshot = list(ledger)
    try:
        yield ledger
    except Exception:
        ledger[:] = snapshot
        raise
`,
          fails: ["restored", "in-place", "other-error"],
          why: "errors reach the caller now, but entries changed in place stay changed",
        },
        {
          code: src`
from contextlib import contextmanager

@contextmanager
def transaction(ledger):
    snapshot = [dict(entry) for entry in ledger]
    try:
        yield ledger
    except Exception:
        ledger[:] = snapshot
`,
          fails: ["propagates", "other-error"],
          why: "the rollback is complete now, but the error is still swallowed",
        },
      ],
      task: {
        checks: [
          expr("propagates", "the error reaches the caller", "_l = [{'order_id': 'O1', 'amount': 1.0}]\ntry:\n    with transaction(_l):\n        raise ValueError('x')\n    result = 'swallowed'\nexcept ValueError:\n    result = 'raised'", "raised", { show: "an error inside the block: raised or swallowed?" }),
          expr("restored", "after a failed block the ledger is exactly as before", "_l = [{'order_id': 'O100282', 'amount': 35.84}, {'order_id': 'O101219', 'amount': 246.6}]\ntry:\n    with transaction(_l) as _e:\n        _e[0]['amount'] = 0\n        _e.append({'order_id': 'O999999', 'amount': -5})\n        raise ValueError('refund larger than the order')\nexcept ValueError:\n    pass\nresult = _l", [{ order_id: "O100282", amount: 35.84 }, { order_id: "O101219", amount: 246.6 }], { show: "the ledger after the failed refund" }),
          expr("success", "a finished block keeps its edits", "_l = [{'order_id': 'O1', 'amount': 10.0}]\nwith transaction(_l) as _e:\n    _e[0]['amount'] = 12.5\n    _e.append({'order_id': 'O2', 'amount': 3.0})\nresult = _l", [{ order_id: "O1", amount: 12.5 }, { order_id: "O2", amount: py.float(3) }], { show: "the ledger after a block that finished" }),
          expr("in-place", "an entry changed in place before the error", "_l = [{'order_id': 'O7', 'amount': 99.0, 'status': 'paid'}]\ntry:\n    with transaction(_l) as _e:\n        _e[0]['status'] = 'refunded'\n        raise RuntimeError('gateway down')\nexcept RuntimeError:\n    pass\nresult = _l", [{ order_id: "O7", amount: py.float(99), status: "paid" }], { hidden: true }),
          expr("other-error", "an error that isn't an Exception subclass the code expects", "_l = [{'order_id': 'O8', 'amount': 1.0}]\ntry:\n    with transaction(_l) as _e:\n        _e.pop()\n        raise KeyboardInterrupt()\nexcept KeyboardInterrupt:\n    result = _l", [{ order_id: "O8", amount: py.float(1) }], { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q33-06 function implementation, easy
  {
    id: "PY-Q33-06",
    version: 2,
    slug: "case-insensitive-arguments",
    title: "Case-insensitive arguments",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "comparison", "conditional-expr", "decorator-at", "decorator-call", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "list-comp", "list-literal", "list-mutate", "membership", "print-call", "print-several", "print-text", "star-args", "star-kwargs", "string-method", "top-level-indent", "type-call", "wraps-dec"],
    prompt: "SKUs and station IDs are typed by people, in any case and with stray spaces. Write a decorator `ignore_case(func)` that strips and lower-cases every **text** positional argument before calling `func`, leaving other arguments and keyword arguments alone. It is applied to `same_sku(a, b)` in the starter. The decorated function keeps its name.",
    spec: [
      ["Decorator", "`ignore_case(func)`; text positional arguments are passed on as `arg.strip().lower()`"],
      ["Applied to", "`same_sku(a, b)`, which compares two SKUs with `==`"],
      ["Identity", "use `functools.wraps`"],
    ],
    hiddenKinds: ["two different SKUs", "spaces and mixed case", "arguments that aren't text", "keyword arguments left alone", "the decorated function's name"],
    hints: [
      "The wrapper takes `*args, **kwargs` and builds a new tuple or list of arguments.",
      "Only text changes: test each argument with `isinstance(arg, str)`.",
      "Call the original with the new positional arguments and the untouched keyword arguments, return its result, and decorate the wrapper with `functools.wraps`, passing it the original.",
    ],
    explanation: "The wrapper rebuilds the positional arguments, cleaning only strings (a number or None passes through as it is), then calls the original with the new arguments and the untouched keyword arguments. Because the cleaning lives in the decorator, every comparison function that needs it can reuse it with one line.",
    code: {
      starter: src`
import functools

def ignore_case(func):
    return func

@ignore_case
def same_sku(a, b):
    return a == b

print(same_sku("SPO-11681", " spo-11681"))
`,
      answer: src`
import functools

def ignore_case(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        cleaned = [arg.strip().lower() if isinstance(arg, str) else arg for arg in args]
        return func(*cleaned, **kwargs)
    return wrapper

@ignore_case
def same_sku(a, b):
    return a == b

print(same_sku("SPO-11681", " spo-11681"))
`,
      alternatives: [
        src`
from functools import wraps

def ignore_case(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        new_args = []
        for arg in args:
            if type(arg) is str:
                arg = arg.lower().strip()
            new_args.append(arg)
        return func(*new_args, **kwargs)
    return wrapper

@ignore_case
def same_sku(a, b):
    return a == b
`,
      ],
      wrong: [
        {
          code: src`
import functools

def ignore_case(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*[arg.lower() for arg in args], **kwargs)
    return wrapper

@ignore_case
def same_sku(a, b):
    return a == b
`,
          fails: ["returns", "not-text", "keywords"],
          why: "spaces aren't stripped, and a number argument crashes `lower()`",
        },
        {
          code: src`
import functools

def ignore_case(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        cleaned = [arg.strip().lower() if isinstance(arg, str) else arg for arg in args]
        kwargs = {k: v.strip().lower() if isinstance(v, str) else v for k, v in kwargs.items()}
        return func(*cleaned, **kwargs)
    return wrapper

@ignore_case
def same_sku(a, b):
    return a == b
`,
          fails: ["keywords"],
          why: "keyword arguments are changed too, which the rule doesn't allow",
        },
        {
          code: src`
def ignore_case(func):
    def wrapper(*args, **kwargs):
        cleaned = [arg.strip().lower() if isinstance(arg, str) else arg for arg in args]
        return func(*cleaned, **kwargs)
    return wrapper

@ignore_case
def same_sku(a, b):
    return a == b
`,
          fails: ["name"],
          why: "without `wraps`, `same_sku.__name__` is `wrapper`",
        },
      ],
      task: {
        checks: [
          fn("returns", "same_sku", [
            example(["SPO-11681", " spo-11681"], true),
            example(["HOM-22847", "hom-22847"], true),
            example(["TOY-54564", "TOY-54565"], false),
            hiddenCase("two different SKUs", ["ele-24781", "ELE-01243"], false),
            hiddenCase("spaces and mixed case", ["  Gro-41017\t", "gRO-41017 "], true),
          ], { label: "same_sku() compares SKUs ignoring case and spaces" }),
          expr("not-text", "arguments that aren't text", "@ignore_case\ndef _f(a, b, c):\n    return (a, b, c)\nresult = _f(' ABC ', 7, None)", py.tuple(py.str("abc"), py.int(7), py.none), { hidden: true }),
          expr("keywords", "keyword arguments left alone", "@ignore_case\ndef _g(code, label=''):\n    return code + '|' + label\nresult = _g(' USW00094846 ', label=' Chicago ')", "usw00094846| Chicago ", { hidden: true }),
          expr("name", "the decorated function's name", "result = same_sku.__name__", "same_sku", { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q33-10 integration, easy
  {
    id: "PY-Q33-10",
    version: 2,
    slug: "capture-printed-output",
    title: "Capture what a function prints",
    format: "integration",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "finally-clause", "for-loop", "function-def", "function-default", "function-param", "function-return", "import-module", "len-call", "list-literal", "membership", "print-call", "print-several", "print-text", "star-args", "star-kwargs", "top-level-indent", "try-except", "with-statement"],
    prompt: "An old report function prints its progress instead of logging it, and a scheduler wants to keep that text. Write `run_captured(func, *args, **kwargs)`: call `func` with the arguments while capturing everything it prints, and return `(result, lines)`, the function's return value and the printed text as a list of lines. If `func` raises, the exception propagates, and printing goes back to normal either way.",
    spec: [
      ["Function", "`run_captured(func, *args, **kwargs)`"],
      ["Returns", "`(result, lines)`; `lines` from `text.splitlines()`"],
      ["Tools", "`io.StringIO` and `contextlib.redirect_stdout`"],
    ],
    hiddenKinds: ["a function that prints nothing", "keyword arguments", "a function that raises", "printing after an error"],
    hints: [
      "`redirect_stdout(buffer)` sends everything printed inside its block to `buffer`.",
      "Call the function inside the `with` block, passing `*args, **kwargs` on.",
      "After the block, `buffer.getvalue().splitlines()` gives the lines; return them with the result.",
    ],
    explanation: "`redirect_stdout` is a context manager: inside its block, `print` writes to the given buffer, and when the block ends, for any reason, the real output is restored. That's why an exception from `func` both propagates and leaves printing working afterwards. A hand-written swap of `sys.stdout` without `try`/`finally` would leave the program printing into the buffer after an error.",
    code: {
      starter: src`
import io
from contextlib import redirect_stdout

def run_captured(func, *args, **kwargs):
    return (func(*args, **kwargs), [])

def import_stations(paths, verbose=True):
    for path in paths:
        print("reading", path)
    return len(paths)

print(run_captured(import_stations, ["ord.csv", "lax.csv"]))
`,
      answer: src`
import io
from contextlib import redirect_stdout

def run_captured(func, *args, **kwargs):
    buffer = io.StringIO()
    with redirect_stdout(buffer):
        result = func(*args, **kwargs)
    return (result, buffer.getvalue().splitlines())

def import_stations(paths, verbose=True):
    for path in paths:
        print("reading", path)
    return len(paths)

print(run_captured(import_stations, ["ord.csv", "lax.csv"]))
`,
      alternatives: [
        src`
import io
import sys

def run_captured(func, *args, **kwargs):
    original = sys.stdout
    sys.stdout = buffer = io.StringIO()
    try:
        result = func(*args, **kwargs)
    finally:
        sys.stdout = original
    return result, buffer.getvalue().splitlines()
`,
      ],
      wrong: [
        {
          code: src`
import io
import sys

def run_captured(func, *args, **kwargs):
    original = sys.stdout
    sys.stdout = buffer = io.StringIO()
    result = func(*args, **kwargs)
    sys.stdout = original
    return (result, buffer.getvalue().splitlines())
`,
          fails: ["restored"],
          why: "when the function raises, `sys.stdout` is never put back, so later prints vanish",
        },
        {
          code: src`
import io
from contextlib import redirect_stdout

def run_captured(func, *args, **kwargs):
    buffer = io.StringIO()
    with redirect_stdout(buffer):
        result = func(*args)
    return (result, buffer.getvalue().splitlines())
`,
          fails: ["keywords"],
          why: "keyword arguments aren't passed on",
        },
      ],
      task: {
        checks: [
          expr("returns", "the result and the printed lines", "def _imp(paths):\n    for _p in paths:\n        print('reading', _p)\n    return len(paths)\nresult = run_captured(_imp, ['ord.csv', 'lax.csv'])", py.tuple(py.int(2), pv(["reading ord.csv", "reading lax.csv"])), { show: "run_captured(import_stations, ['ord.csv', 'lax.csv'])" }),
          expr("silent", "a function that prints nothing", "result = run_captured(sum, [40.8, 7.2])", py.tuple(py.float(48), py.list()), { show: "run_captured(sum, [40.8, 7.2])" }),
          expr("keywords", "keyword arguments", "def _fmt(value, unit='km', digits=1):\n    print('formatting')\n    return f'{value:.{digits}f} {unit}'\nresult = run_captured(_fmt, 22.4567, unit='mi', digits=2)", py.tuple(py.str("22.46 mi"), pv(["formatting"])), { hidden: true }),
          expr("raises", "a function that raises", "def _bad():\n    print('starting')\n    raise ValueError('bad file')\nrun_captured(_bad)", null, { hidden: true, raises: "ValueError" }),
          expr("restored", "printing after an error", "import sys as _sys\n_before = _sys.stdout\ndef _bad():\n    raise KeyError('k')\ntry:\n    run_captured(_bad)\nexcept KeyError:\n    pass\n_after = _sys.stdout\n_sys.stdout = _before\nresult = _after is _before", true, { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q33-12 function implementation, medium
  {
    id: "PY-Q33-12",
    version: 2,
    slug: "convert-arguments-decorator",
    title: "Convert arguments before the call",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["aggregate-call", "arithmetic", "assignment", "decorator-at", "decorator-call", "for-loop", "function-def", "function-doc", "function-param", "function-return", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "membership", "print-call", "print-several", "print-text", "range-call", "star-args", "star-kwargs", "string-index", "string-slice", "top-level-indent", "wraps-dec", "zip-call"],
    prompt: "Values from CSV files arrive as text, so every pricing function starts by converting its arguments. Write a decorator factory `coerce_args(*converters)`: the n-th converter is applied to the n-th positional argument before the call; arguments beyond the converters, and keyword arguments, are passed unchanged. A conversion error (ValueError) reaches the caller. The starter applies it as `@coerce_args(float, int)` to `line_total(price, quantity)`.",
    spec: [
      ["Factory", "`coerce_args(*converters)`; converters are functions such as `float`, `int`, `str.strip`"],
      ["Applied to", "`line_total(price, quantity)`, which returns `price * quantity`"],
      ["Identity", "the decorated function keeps its name and docstring"],
    ],
    hiddenKinds: ["more arguments than converters", "fewer arguments than converters", "keyword arguments untouched", "text that isn't a number", "values that are already numbers"],
    hints: [
      "Three layers: the factory keeps `converters`, the decorator keeps `func`, the wrapper converts on each call.",
      "`zip(converters, args)` pairs converters with arguments and stops at the shorter one; the arguments after that are kept as they are.",
      "Build the new argument list, call the original with it and the keyword arguments, and copy the original's identity onto the wrapper with `functools.wraps`.",
    ],
    explanation: "Pairing converters with arguments by position and keeping the leftovers means the decorator works whether a call supplies fewer, as many or more positional arguments than there are converters. Conversion happens before the call, so a ValueError from `float(\"n/a\")` reaches the caller unchanged, which is what a pricing function should do with bad data.",
    code: {
      starter: src`
import functools

def coerce_args(*converters):
    def decorator(func):
        return func
    return decorator

@coerce_args(float, int)
def line_total(price, quantity):
    """Price of one order line."""
    return price * quantity

print(line_total("7.49", "3"))
`,
      answer: src`
import functools

def coerce_args(*converters):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            converted = [convert(arg) for convert, arg in zip(converters, args)]
            converted += list(args[len(converted):])
            return func(*converted, **kwargs)
        return wrapper
    return decorator

@coerce_args(float, int)
def line_total(price, quantity):
    """Price of one order line."""
    return price * quantity

print(line_total("7.49", "3"))
`,
      alternatives: [
        src`
from functools import wraps

def coerce_args(*converters):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            new_args = list(args)
            for i in range(min(len(converters), len(args))):
                new_args[i] = converters[i](args[i])
            return func(*new_args, **kwargs)
        return wrapper
    return decorator

@coerce_args(float, int)
def line_total(price, quantity):
    """Price of one order line."""
    return price * quantity
`,
      ],
      wrong: [
        {
          code: src`
import functools

def coerce_args(*converters):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            converted = [convert(arg) for convert, arg in zip(converters, args)]
            return func(*converted, **kwargs)
        return wrapper
    return decorator

@coerce_args(float, int)
def line_total(price, quantity):
    """Price of one order line."""
    return price * quantity
`,
          fails: ["extra-args"],
          why: "`zip` stops at the shorter sequence, so arguments beyond the converters are dropped",
        },
        {
          code: src`
import functools

def coerce_args(*converters):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            converted = [converters[i](arg) for i, arg in enumerate(args)]
            return func(*converted, **kwargs)
        return wrapper
    return decorator

@coerce_args(float, int)
def line_total(price, quantity):
    """Price of one order line."""
    return price * quantity
`,
          fails: ["extra-args"],
          why: "an argument without a converter raises IndexError",
        },
        {
          code: src`
import functools

def coerce_args(*converters):
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            converted = []
            for convert, arg in zip(converters, args):
                try:
                    converted.append(convert(arg))
                except ValueError:
                    converted.append(0)
            converted += list(args[len(converted):])
            return func(*converted, **kwargs)
        return wrapper
    return decorator

@coerce_args(float, int)
def line_total(price, quantity):
    """Price of one order line."""
    return price * quantity
`,
          fails: ["bad-text"],
          why: "bad text silently becomes 0, so a broken row is priced as free",
        },
      ],
      task: {
        checks: [
          fn("returns", "line_total", [
            example(["7.49", "3"], 22.47),
            example(["31.5", "2"], py.float(63)),
            example([12, "4"], 48),
            hiddenCase("values that are already numbers", [26.99, 1], 26.99),
          ], { label: "line_total() converts its text arguments", compare: { numbers: "int-float-equal" } }),
          fn("bad-text", "line_total", [raisesCase(["n/a", "1"], "ValueError", { label: "text that isn't a number" })], { label: "bad text raises ValueError" }),
          expr("extra-args", "more arguments than converters", "@coerce_args(int)\ndef _f(a, b, c):\n    return (a, b, c)\nresult = _f('5', '6', '7')", py.tuple(py.int(5), py.str("6"), py.str("7")), { hidden: true }),
          expr("fewer-args", "fewer arguments than converters", "@coerce_args(float, int, str.strip)\ndef _g(a, b=10, c=' x '):\n    return (a, b, c)\nresult = _g('2.5')", py.tuple(py.float(2.5), py.int(10), py.str(" x ")), { hidden: true }),
          expr("keywords", "keyword arguments untouched", "@coerce_args(float)\ndef _h(price, currency='USD'):\n    return (price, currency)\nresult = _h('9.5', currency=' eur')", py.tuple(py.float(9.5), py.str(" eur")), { hidden: true }),
          expr("identity", "name and docstring are kept", "result = (line_total.__name__, line_total.__doc__)", py.tuple(py.str("line_total"), py.str("Price of one order line.")), { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q33-13 debugging, medium
  {
    id: "PY-Q33-13",
    version: 2,
    slug: "command-table-without-wraps",
    title: "The command table that lists only wrapper",
    format: "debugging",
    difficulty: "medium",
    minutes: 14,
    requires: ["arithmetic", "assignment", "decorator-at", "dict-comp", "dict-literal", "function-def", "function-default", "function-doc", "function-param", "function-return", "import-module", "list-literal", "list-mutate", "membership", "print-call", "print-several", "print-text", "reassignment", "star-args", "star-kwargs", "string-format", "top-level-indent", "unquoted-name", "wraps-dec"],
    prompt: "A maintenance tool builds its command list from functions: the command name is the function's `__name__`, the help text its docstring. Since every command was wrapped with `audited`, the list shows a single command called `wrapper` with no help, and `export(path=..., fmt=...)` crashes with a TypeError. Fix the decorator.",
    spec: [
      ["Decorator", "`audited(func)` appends the command's name to `audit_log` and then runs it"],
      ["commands()", "returns `{name: help}` for the registered commands"],
      ["Must", "keep each command's name and docstring, pass keyword arguments, and log the real name"],
    ],
    hiddenKinds: ["a command called with keyword arguments only", "the audit log after two commands", "a command with no docstring"],
    hints: [
      "Print `sync.__name__` and `export.__doc__` after decoration. What did the wrapper replace?",
      "One line in the decorator copies the original's identity onto the wrapper.",
      "The wrapper's parameters also decide which calls are possible: look at how `export` is called.",
    ],
    explanation: "Without `functools.wraps`, every decorated command is a function named `wrapper` with no docstring, so a table keyed by `__name__` collapses to one entry. Adding `@functools.wraps(func)` copies the name and docstring. The wrapper also only accepted positional arguments, so `export(path=..., fmt=...)` failed; `*args, **kwargs` passes everything through.",
    code: {
      starter: src`
audit_log = []
registered = []

def audited(func):
    def wrapper(*args):
        audit_log.append(wrapper.__name__)
        return func(*args)
    return wrapper

def command(func):
    registered.append(func)
    return func

def commands():
    return {f.__name__: f.__doc__ for f in registered}

@command
@audited
def sync(repo):
    """Pull the latest events for a repository."""
    return f"synced {repo}"

@command
@audited
def export(path, fmt="csv"):
    """Write the event summary to a file."""
    return f"wrote {path} as {fmt}"

print(commands())
print(export(path="summary.csv", fmt="json"))
print(audit_log)
`,
      answer: src`
import functools

audit_log = []
registered = []

def audited(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        audit_log.append(func.__name__)
        return func(*args, **kwargs)
    return wrapper

def command(func):
    registered.append(func)
    return func

def commands():
    return {f.__name__: f.__doc__ for f in registered}

@command
@audited
def sync(repo):
    """Pull the latest events for a repository."""
    return f"synced {repo}"

@command
@audited
def export(path, fmt="csv"):
    """Write the event summary to a file."""
    return f"wrote {path} as {fmt}"

print(commands())
print(export(path="summary.csv", fmt="json"))
print(audit_log)
`,
      alternatives: [
        src`
from functools import update_wrapper

audit_log = []
registered = []

def audited(func):
    def wrapper(*args, **kwargs):
        audit_log.append(func.__name__)
        return func(*args, **kwargs)
    return update_wrapper(wrapper, func)

def command(func):
    registered.append(func)
    return func

def commands():
    return {f.__name__: f.__doc__ for f in registered}

@command
@audited
def sync(repo):
    """Pull the latest events for a repository."""
    return f"synced {repo}"

@command
@audited
def export(path, fmt="csv"):
    """Write the event summary to a file."""
    return f"wrote {path} as {fmt}"
`,
      ],
      wrong: [
        {
          code: src`
import functools

audit_log = []
registered = []

def audited(func):
    @functools.wraps(func)
    def wrapper(*args):
        audit_log.append(func.__name__)
        return func(*args)
    return wrapper

def command(func):
    registered.append(func)
    return func

def commands():
    return {f.__name__: f.__doc__ for f in registered}

@command
@audited
def sync(repo):
    """Pull the latest events for a repository."""
    return f"synced {repo}"

@command
@audited
def export(path, fmt="csv"):
    """Write the event summary to a file."""
    return f"wrote {path} as {fmt}"
`,
          fails: ["keywords", "log", "kw-only"],
          why: "the names are right now, but keyword arguments still crash the wrapper",
        },
        {
          code: src`
audit_log = []
registered = []

def audited(func):
    def wrapper(*args, **kwargs):
        audit_log.append(func.__name__)
        return func(*args, **kwargs)
    return wrapper

def command(func):
    registered.append(func)
    return func

def commands():
    return {f.__name__: f.__doc__ for f in registered}

@command
@audited
def sync(repo):
    """Pull the latest events for a repository."""
    return f"synced {repo}"

@command
@audited
def export(path, fmt="csv"):
    """Write the event summary to a file."""
    return f"wrote {path} as {fmt}"
`,
          fails: ["returns", "no-doc"],
          why: "keyword arguments work now, but the commands are still all called `wrapper`",
        },
      ],
      task: {
        checks: [
          expr("returns", "commands() lists both commands with their help", "result = commands()", { sync: "Pull the latest events for a repository.", export: "Write the event summary to a file." }, { show: "commands()" }),
          expr("keywords", "export with keyword arguments", "result = export(path='summary.csv', fmt='json')", "wrote summary.csv as json", { show: "export(path='summary.csv', fmt='json')" }),
          expr("log", "the audit log after two commands", "audit_log.clear()\nsync('tidewater/smartqueue')\nexport('a.csv', fmt='csv')\nresult = list(audit_log)", ["sync", "export"], { hidden: true }),
          expr("kw-only", "a command called with keyword arguments only", "@audited\ndef _purge(*, older_than_days=30):\n    return older_than_days\nresult = _purge(older_than_days=7)", 7, { hidden: true }),
          expr("no-doc", "a command with no docstring", "@audited\ndef _ping():\n    return 'pong'\nresult = (_ping.__name__, _ping.__doc__)", py.tuple(py.str("_ping"), py.none), { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q33-16 function implementation, medium
  {
    id: "PY-Q33-16",
    version: 2,
    slug: "normalised-keys-decorator",
    title: "Normalise the keys a function returns",
    format: "function_implementation",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "comparison", "decorator-at", "decorator-call", "dict-iterate", "dict-literal", "else-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-condition", "print-call", "print-several", "print-text", "raise-stmt", "star-args", "star-kwargs", "string-format", "string-index", "string-method", "top-level-indent", "type-call", "wraps-dec", "zip-call"],
    prompt: "Station files from different sources call the same column `Station ID`, `station_id` or ` STATION-ID `. Write a decorator `snake_keys(func)` for functions that return a dictionary: the wrapper returns a new dictionary whose keys are stripped, lower-cased, and have every run of spaces and dashes replaced by one underscore. If two keys become the same, raise `ValueError`. A result that isn't a dictionary is returned unchanged. The starter applies it to `record(fields, values)`.",
    spec: [
      ["Decorator", "`snake_keys(func)`, with `functools.wraps`"],
      ["Keys", "`\" Max Temp (C) \"` → `\"max_temp_(c)\"`; `\"STATION-ID\"` → `\"station_id\"`; only spaces and dashes become underscores"],
      ["Raises", "`ValueError` when two keys normalise to the same name"],
      ["Applied to", "`record(fields, values)`, which returns `dict(zip(fields, values))`"],
    ],
    hiddenKinds: ["two keys that collide", "keys with runs of spaces and dashes", "a result that isn't a dictionary", "values left unchanged", "an empty record"],
    hints: [
      "Call the original first; if the result isn't a dict, return it as it is.",
      "Normalise each key with `strip`, `lower` and `re.sub(r\"[ -]+\", \"_\", ...)` (see Dates Numbers & Regex).",
      "Build a new dictionary, and raise ValueError when a normalised key is already in it.",
    ],
    explanation: "Normalising inside a decorator puts one rule in one place for every loader. Building a new dictionary (instead of renaming keys in the original) and checking each new key before adding it catches collisions like `Station ID` and `station-id`, which would otherwise silently overwrite one column with the other.",
    code: {
      starter: src`
import functools
import re

def snake_keys(func):
    return func

@snake_keys
def record(fields, values):
    return dict(zip(fields, values))

print(record(["Station ID", " Max Temp (C) "], ["USW00094846", "31.7"]))
`,
      answer: src`
import functools
import re

def snake_keys(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        if not isinstance(result, dict):
            return result
        cleaned = {}
        for key, value in result.items():
            name = re.sub(r"[ -]+", "_", key.strip().lower())
            if name in cleaned:
                raise ValueError(f"two keys become {name}")
            cleaned[name] = value
        return cleaned
    return wrapper

@snake_keys
def record(fields, values):
    return dict(zip(fields, values))

print(record(["Station ID", " Max Temp (C) "], ["USW00094846", "31.7"]))
`,
      alternatives: [
        src`
from functools import wraps

def normalise(key):
    out = ""
    for ch in key.strip().lower():
        if ch in " -":
            if not out.endswith("_"):
                out += "_"
        else:
            out += ch
    return out

def snake_keys(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        if type(result) is not dict:
            return result
        names = [normalise(k) for k in result]
        if len(set(names)) != len(names):
            raise ValueError("duplicate keys")
        return dict(zip(names, result.values()))
    return wrapper

@snake_keys
def record(fields, values):
    return dict(zip(fields, values))
`,
      ],
      wrong: [
        {
          code: src`
import functools

def snake_keys(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        return {key.strip().lower().replace(" ", "_").replace("-", "_"): value for key, value in result.items()}
    return wrapper

@snake_keys
def record(fields, values):
    return dict(zip(fields, values))
`,
          fails: ["returns", "collide", "runs", "not-dict"],
          why: "each space or dash becomes its own underscore, collisions silently overwrite, and a list result crashes",
        },
        {
          code: src`
import functools
import re

def snake_keys(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        if not isinstance(result, dict):
            return result
        return {re.sub(r"[ -]+", "_", key.strip().lower()): value for key, value in result.items()}
    return wrapper

@snake_keys
def record(fields, values):
    return dict(zip(fields, values))
`,
          fails: ["collide"],
          why: "two keys that normalise alike overwrite each other instead of raising",
        },
        {
          code: src`
import functools
import re

def snake_keys(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        if not isinstance(result, dict):
            return result
        cleaned = {}
        for key, value in result.items():
            name = re.sub(r"\W+", "_", key.strip().lower())
            if name in cleaned:
                raise ValueError(name)
            cleaned[name] = value
        return cleaned
    return wrapper

@snake_keys
def record(fields, values):
    return dict(zip(fields, values))
`,
          fails: ["returns", "runs"],
          why: "`\\W+` also replaces brackets and other punctuation, which the rule keeps",
        },
      ],
      task: {
        checks: [
          fn("returns", "record", [
            example([["Station ID", " Max Temp (C) "], ["USW00094846", "31.7"]], { station_id: "USW00094846", "max_temp_(c)": "31.7" }),
            example([["STATION-ID", "date"], ["USW00023174", "2024-07-01"]], { station_id: "USW00023174", date: "2024-07-01" }),
            example([["precip_mm"], [0]], { precip_mm: 0 }),
            hiddenCase("keys with runs of spaces and dashes", [["wind  - gust", "snow--depth"], [12.4, null]], { wind_gust: 12.4, snow_depth: null }),
            hiddenCase("an empty record", [[], []], {}),
          ], { label: "record() returns normalised keys" }),
          fn("collide", "record", [raisesCase([["Station ID", "station-id"], ["A", "B"]], "ValueError", { label: "two keys that collide" })], { label: "colliding keys raise ValueError" }),
          expr("runs", "runs of spaces and dashes become one underscore", "@snake_keys\ndef _r():\n    return {'Peak  Gust - m/s': 21.5}\nresult = _r()", { "peak_gust_m/s": 21.5 }, { hidden: true }),
          expr("not-dict", "a result that isn't a dictionary", "@snake_keys\ndef _l():\n    return ['Station ID']\nresult = (_l(), _l.__name__)", py.tuple(pv(["Station ID"]), py.str("_l")), { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q33-19 integration, medium
  {
    id: "PY-Q33-19",
    version: 2,
    slug: "temporary-environment-variables",
    title: "Temporary environment variables",
    format: "integration",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "conditional-expr", "context-dec", "decorator-at", "dict-comp", "dict-get", "dict-iterate", "dict-literal", "else-clause", "env-read", "finally-clause", "for-loop", "function-def", "function-param", "identity", "if-statement", "import-module", "list-mutate", "membership", "nested-condition", "none-value", "print-call", "print-text", "star-kwargs", "string-index", "top-level-indent", "try-except", "with-statement", "yield-expr"],
    prompt: "Tests of a command-line tool need to run it with particular environment variables (see CLI & Automation) and must leave the environment exactly as they found it. Write `env_vars(**changes)` with `@contextmanager`: for the block, set each variable to its value, or remove it when the value is `None`; afterwards restore every variable to its old value, or remove it if it didn't exist before, even when the block raises.",
    spec: [
      ["Context manager", "`env_vars(**changes)`, e.g. `with env_vars(REPORT_CURRENCY=\"EUR\", DEBUG=None):`"],
      ["During", "`os.environ` has the new values; a `None` value means the variable is absent"],
      ["After", "`os.environ` is exactly as before for every name in `changes`; exceptions propagate"],
    ],
    hiddenKinds: ["a variable that didn't exist before", "a variable removed for the block", "an error inside the block", "nested blocks changing the same variable"],
    hints: [
      "Before changing anything, remember each name's old value with `os.environ.get(name)` (None means it wasn't set).",
      "Apply the changes: assign text values, and remove the variable (a `pop` with a default, so a missing one is fine) for `None`.",
      "Restore in a `finally` after the `yield`: put back old values, and pop names whose old value was None.",
    ],
    explanation: "Remembering `os.environ.get(name)` for every name first gives a complete undo list, including the names that didn't exist. Restoring in `finally` makes the undo run after errors too, and the exception still propagates because nothing catches it. Restoring by assigning `None` would crash (`os.environ` only holds text), and forgetting to remove new variables leaks them into later tests.",
    code: {
      starter: src`
import os
from contextlib import contextmanager

@contextmanager
def env_vars(**changes):
    yield

with env_vars(REPORT_CURRENCY="EUR"):
    print(os.environ.get("REPORT_CURRENCY"))
print(os.environ.get("REPORT_CURRENCY"))
`,
      answer: src`
import os
from contextlib import contextmanager

@contextmanager
def env_vars(**changes):
    old = {name: os.environ.get(name) for name in changes}
    for name, value in changes.items():
        if value is None:
            os.environ.pop(name, None)
        else:
            os.environ[name] = value
    try:
        yield
    finally:
        for name, value in old.items():
            if value is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = value

with env_vars(REPORT_CURRENCY="EUR"):
    print(os.environ.get("REPORT_CURRENCY"))
print(os.environ.get("REPORT_CURRENCY"))
`,
      alternatives: [
        src`
import os
from contextlib import contextmanager

def apply(values):
    for name, value in values.items():
        if value is None:
            if name in os.environ:
                del os.environ[name]
        else:
            os.environ[name] = value

@contextmanager
def env_vars(**changes):
    saved = {}
    for name in changes:
        saved[name] = os.environ[name] if name in os.environ else None
    apply(changes)
    try:
        yield
    finally:
        apply(saved)
`,
      ],
      wrong: [
        {
          code: src`
import os
from contextlib import contextmanager

@contextmanager
def env_vars(**changes):
    old = {name: os.environ.get(name) for name in changes}
    for name, value in changes.items():
        if value is None:
            os.environ.pop(name, None)
        else:
            os.environ[name] = value
    yield
    for name, value in old.items():
        if value is None:
            os.environ.pop(name, None)
        else:
            os.environ[name] = value
`,
          fails: ["error"],
          why: "the restore is skipped when the block raises",
        },
        {
          code: src`
import os
from contextlib import contextmanager

@contextmanager
def env_vars(**changes):
    old = {name: os.environ[name] for name in changes if name in os.environ}
    for name, value in changes.items():
        if value is not None:
            os.environ[name] = value
    try:
        yield
    finally:
        for name, value in old.items():
            os.environ[name] = value
`,
          fails: ["returns", "new-var", "removed", "nested"],
          why: "variables that didn't exist are left behind, and `None` doesn't remove a variable",
        },
      ],
      task: {
        checks: [
          expr("returns", "a variable is set during the block and gone after", "import os as _os\n_os.environ.pop('M33_CURRENCY', None)\nwith env_vars(M33_CURRENCY='EUR'):\n    _inside = _os.environ.get('M33_CURRENCY')\nresult = (_inside, _os.environ.get('M33_CURRENCY'))", py.tuple(py.str("EUR"), py.none), { show: "M33_CURRENCY inside and after the block" }),
          expr("existing", "an existing variable gets its old value back", "import os as _os\n_os.environ['M33_TIMEOUT'] = '30'\nwith env_vars(M33_TIMEOUT='5'):\n    _inside = _os.environ['M33_TIMEOUT']\nresult = (_inside, _os.environ['M33_TIMEOUT'])", py.tuple(py.str("5"), py.str("30")), { show: "M33_TIMEOUT inside and after, starting at '30'" }),
          expr("new-var", "a variable that didn't exist before", "import os as _os\n_os.environ.pop('M33_NEW', None)\nwith env_vars(M33_NEW='1'):\n    pass\nresult = 'M33_NEW' in _os.environ", false, { hidden: true }),
          expr("removed", "a variable removed for the block", "import os as _os\n_os.environ['M33_DEBUG'] = 'yes'\nwith env_vars(M33_DEBUG=None):\n    _inside = 'M33_DEBUG' in _os.environ\nresult = (_inside, _os.environ.get('M33_DEBUG'))", py.tuple(py.bool(false), py.str("yes")), { hidden: true }),
          expr("error", "an error inside the block", "import os as _os\n_os.environ['M33_MODE'] = 'prod'\ntry:\n    with env_vars(M33_MODE='test'):\n        raise RuntimeError('tool crashed')\nexcept RuntimeError:\n    _caught = True\nresult = (_caught, _os.environ['M33_MODE'])", py.tuple(py.bool(true), py.str("prod")), { hidden: true }),
          expr("nested", "nested blocks changing the same variable", "import os as _os\n_os.environ.pop('M33_LEVEL', None)\nwith env_vars(M33_LEVEL='outer'):\n    with env_vars(M33_LEVEL='inner'):\n        _a = _os.environ['M33_LEVEL']\n    _b = _os.environ['M33_LEVEL']\nresult = (_a, _b, _os.environ.get('M33_LEVEL'))", py.tuple(py.str("inner"), py.str("outer"), py.none), { hidden: true }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q33-20 testing, medium
  {
    id: "PY-Q33-20",
    version: 2,
    slug: "tests-for-retry-decorator",
    title: "Tests for a retry decorator",
    format: "testing",
    difficulty: "medium",
    minutes: 16,
    requires: ["assert-stmt", "assignment", "boolean", "class-def", "comment", "comment-out", "comparison", "decorator-at", "decorator-call", "except-type", "function-def", "function-default", "function-param", "function-return", "if-statement", "import-module", "lambda", "len-call", "list-literal", "list-mutate", "logical", "none-value", "raise-stmt", "reassignment", "test-func", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "unittest-case", "with-statement"],
    prompt: "`retrying.py` has `retry_on(*exceptions, attempts=3, sleep=None)`: it retries the decorated function on the listed exceptions, up to `attempts` calls in total, calling `sleep(1)`, `sleep(2)`, `sleep(4)`, … between them, and raises the last error when the attempts run out. Other exceptions are raised at once. Write unittest tests that pass on it and catch broken versions. Use a fake function that fails a set number of times, and pass `sleep=waits.append` so nothing really waits.",
    spec: [
      ["Write", "a `unittest.TestCase` (or `test_` functions) that decorate small fake functions with `retry_on` and assert what happens"],
      ["Rules", "listed exceptions are retried; others are raised immediately; at most `attempts` calls; waits double; the last error is raised"],
      ["Graded", "your tests run against the real decorator and against broken ones; don't call them yourself"],
    ],
    hiddenKinds: ["a version that retries every exception", "a version that returns None when the attempts run out", "a version that makes one call too many", "a version whose waits don't grow"],
    hints: [
      "A fake that fails a set number of times is easiest with a list of outcomes and a counter of calls.",
      "Check the number of calls and the list of waits, not only the final result.",
      "Include a function that always fails (does the error come out, after how many calls?) and one that raises an exception that isn't listed.",
    ],
    explanation: "Each rule needs its own observation. Counting calls catches an off-by-one in the attempts; the list of waits catches a backoff that doesn't grow; `assertRaises` on a function that always fails catches a decorator that gives up silently; and a function raising an unlisted exception catches one that retries everything. A test that only checks \"it eventually returns the right value\" passes on most broken versions.",
    code: {
      starter: src`
import unittest
from retrying import retry_on

class RetryTests(unittest.TestCase):
    def test_succeeds_eventually(self):
        outcomes = [ConnectionError("reset"), "ok"]

        @retry_on(ConnectionError, attempts=3, sleep=lambda s: None)
        def fetch():
            outcome = outcomes.pop(0)
            if isinstance(outcome, Exception):
                raise outcome
            return outcome

        self.assertEqual(fetch(), "ok")

# Add tests that would fail on a broken retry_on. Check runs them for you.
`,
      answer: src`
import unittest
from retrying import retry_on

def flaky(failures, error=ConnectionError):
    calls = []
    def func():
        calls.append(1)
        if len(calls) <= failures:
            raise error("temporary")
        return "ok"
    return func, calls

class RetryTests(unittest.TestCase):
    def test_retries_listed_errors_with_doubling_waits(self):
        waits = []
        func, calls = flaky(2)
        self.assertEqual(retry_on(ConnectionError, attempts=4, sleep=waits.append)(func)(), "ok")
        self.assertEqual(len(calls), 3)
        self.assertEqual(waits, [1, 2])

    def test_gives_up_after_attempts(self):
        waits = []
        func, calls = flaky(10)
        with self.assertRaises(ConnectionError):
            retry_on(ConnectionError, attempts=3, sleep=waits.append)(func)()
        self.assertEqual(len(calls), 3)
        self.assertEqual(waits, [1, 2])

    def test_other_errors_are_not_retried(self):
        func, calls = flaky(1, error=ValueError)
        with self.assertRaises(ValueError):
            retry_on(ConnectionError, attempts=3, sleep=lambda s: None)(func)()
        self.assertEqual(len(calls), 1)
`,
      alternatives: [
        src`
from retrying import retry_on

def test_counts_and_waits():
    waits, calls = [], []
    @retry_on(TimeoutError, attempts=3, sleep=waits.append)
    def always_slow():
        calls.append(1)
        raise TimeoutError("slow")
    caught = []
    try:
        always_slow()
    except TimeoutError as err:
        caught.append(err)
    assert len(caught) == 1 and len(calls) == 3 and waits == [1, 2]

def test_unlisted_error_once():
    calls = []
    @retry_on(TimeoutError, attempts=5, sleep=lambda s: None)
    def broken():
        calls.append(1)
        raise KeyError("x")
    try:
        broken()
    except KeyError:
        pass
    assert len(calls) == 1
`,
      ],
      wrong: [
        {
          code: src`
import unittest
from retrying import retry_on

class RetryTests(unittest.TestCase):
    def test_succeeds_eventually(self):
        outcomes = [ConnectionError("reset"), "ok"]

        @retry_on(ConnectionError, attempts=3, sleep=lambda s: None)
        def fetch():
            outcome = outcomes.pop(0)
            if isinstance(outcome, Exception):
                raise outcome
            return outcome

        self.assertEqual(fetch(), "ok")
`,
          fails: ["tests-1", "tests-2", "tests-3", "tests-4"],
          why: "only the happy path is tested, which every broken version also passes",
        },
        {
          code: src`
import unittest
from retrying import retry_on

class RetryTests(unittest.TestCase):
    def test_gives_up(self):
        calls = []

        @retry_on(ConnectionError, attempts=3, sleep=lambda s: None)
        def always():
            calls.append(1)
            raise ConnectionError("down")

        with self.assertRaises(ConnectionError):
            always()
        self.assertEqual(len(calls), 4)
`,
          fails: ["tests-correct", "tests-3"],
          why: "the test expects 4 calls for 3 attempts: it fails on the correct decorator and passes on the one that calls once too often",
        },
      ],
      task: {
        files: { "retrying.py": RETRY_PY },
        checks: hideDefects(learnerTests("tests", {
          target: "retry_on",
          correct: RETRY_PY,
          defects: [
            { label: "a version that retries every exception", code: RETRY_PY.replace("except exceptions:", "except Exception:") },
            { label: "a version that returns None when the attempts run out", code: RETRY_PY.replace("                    if attempt == attempts:\n                        raise\n", "                    if attempt == attempts:\n                        return None\n") },
            { label: "a version that makes one call too many", code: RETRY_PY.replace("range(1, attempts + 1)", "range(1, attempts + 2)").replace("if attempt == attempts:", "if attempt == attempts + 1:") },
            { label: "a version whose waits don't grow", code: RETRY_PY.replace("                    wait *= 2\n", "") },
          ],
        })),
      },
    },
  },

  // ------------------------------------------------------------------ PY-Q33-22 output prediction, hard
  {
    id: "PY-Q33-22",
    version: 2,
    slug: "predict-nested-context-managers",
    title: "Predict: an error through three context managers",
    format: "output_prediction",
    difficulty: "hard",
    minutes: 12,
    requires: ["attr-assign", "class-def", "conditional-expr", "context-dec", "decorator-at", "enter-method", "finally-clause", "function-def", "function-param", "function-return", "identity", "import-module", "init-method", "method-def", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "top-level-indent", "try-except", "with-statement", "yield-expr"],
    prompt: "An error is raised inside three nested context managers: two class-based guards that each suppress one exception type, and a generator-based step with a `finally`. Predict exactly what this prints.",
    spec: [
      ["Watch", "the order of the exits, which guard suppresses the KeyError, and which lines are skipped"],
    ],
    hiddenKinds: [],
    hints: [
      "Exits run from the innermost manager outwards.",
      "The inner guard only swallows ValueError, so the KeyError carries on through the `finally` of `step`.",
      "Once a guard suppresses the error, execution continues after that guard's `with` block, skipping the lines inside it that weren't reached.",
    ],
    explanation: "The managers are entered outer to inner and exited inner to outer. The inner guard sees a KeyError, which isn't its type, so it returns False and the error moves on. `step`'s generator gets the error at its `yield`; the `finally` prints `end load` and the error continues. The outer guard swallows KeyError, so the program carries on after the outer `with`: `after inner` and `after step` were never reached.",
    predict: {
      program: src`
from contextlib import contextmanager

class Guard:
    def __init__(self, name, swallow):
        self.name = name
        self.swallow = swallow

    def __enter__(self):
        print("enter", self.name)
        return self

    def __exit__(self, exc_type, exc, traceback):
        print("exit", self.name, exc_type.__name__ if exc_type else "-")
        return exc_type is self.swallow

@contextmanager
def step(name):
    print("start", name)
    try:
        yield
    finally:
        print("end", name)

with Guard("outer", KeyError):
    with step("load"):
        with Guard("inner", ValueError):
            raise KeyError("station")
        print("after inner")
    print("after step")
print("after outer")
`,
      output: "enter outer\nstart load\nenter inner\nexit inner KeyError\nend load\nexit outer KeyError\nafter outer\n",
      wrongPredictions: [
        "enter outer\nstart load\nenter inner\nexit inner KeyError\nexit outer KeyError\nend load\nafter outer\n",
        "enter outer\nstart load\nenter inner\nexit inner KeyError\nend load\nafter step\nexit outer -\nafter outer\n",
        "enter outer\nstart load\nenter inner\nexit inner KeyError\nafter inner\nend load\nafter step\nexit outer -\nafter outer\n",
      ],
    },
  },
];
