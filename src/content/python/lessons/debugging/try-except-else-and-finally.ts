import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const f = py.float;
const strs = (...xs: string[]) => py.list(...xs.map(s));

export const tryExceptElseAndFinally: PyLesson = {
  slug: "try-except-else-and-finally",
  ref: "python:try-except-else-and-finally",
  module: "debugging",
  number: 3,
  title: "try, except, else and finally",
  level: "intermediate",
  summary:
    "Handle errors you expect instead of crashing: run risky code in `try`, catch specific exception types with `except`, put the success path in `else`, and use `finally` for clean-up that must happen either way.",

  sections: [
    {
      label: "try and except",
      blocks: [
        {
          kind: "p",
          text: "Code inside `try:` runs normally. If it raises an exception, Python jumps straight to the first matching `except` block, runs it, and carries on after the whole statement. If nothing goes wrong, the `except` blocks are skipped.",
        },
        { kind: "code", code: 'try:\n    amount = float(text)\nexcept ValueError:\n    amount = None' },
        {
          kind: "p",
          text: "Catch the **specific** exceptions you expect and know how to handle. A bare `except:` or `except Exception:` also catches bugs you didn't expect (a typo's `NameError`, say) and hides them. Keep the `try` block small, so it's clear which line you expected to fail.",
        },
        {
          kind: "p",
          text: "`except ValueError as error:` gives you the exception object: `str(error)` is its message and `type(error).__name__` its type. Several types can share a block: `except (KeyError, ValueError):`.",
        },
      ],
    },
    {
      label: "else and finally",
      blocks: [
        {
          kind: "p",
          text: "`else:` runs only if the `try` block raised **nothing**. It's the place for the code that should run after success but shouldn't be protected by the `except` (so its own errors aren't caught by mistake).",
        },
        {
          kind: "p",
          text: "`finally:` runs **whatever happens**: after success, after a handled error, and even when an unhandled error is on its way out, or a `return` is leaving the function. Use it for clean-up: closing a file, releasing a lock, writing an “end” entry to a log.",
        },
        { kind: "code", code: 'try:\n    value = int(text)\nexcept ValueError:\n    print("not a number")\nelse:\n    print("parsed", value)\nfinally:\n    print("done")' },
      ],
    },
    {
      label: "handle, then decide",
      blocks: [
        {
          kind: "p",
          text: "Handling an error means doing something sensible: using a default, skipping the item and counting it, or reporting a clearer error. Writing `except: pass` makes problems disappear silently, which is worse than crashing. If you can't do anything useful, let the exception propagate.",
        },
      ],
    },
  ],

  example: {
    caption: "Parsing amounts, keeping the good ones and counting the bad ones. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'texts = ["12.50", "abc", "7", "", "3.25"]\ntotal = 0\nrejected = []\nfor text in texts:\n    try:\n        amount = float(text)\n    except ValueError:\n        rejected.append(text)\n    else:\n        total += amount\n\nprint("Total:", total)\nprint("Rejected:", rejected)',
  },

  walkthrough: [
    {
      title: "except runs only when something fails",
      text: "The first conversion succeeds, so its `except` is skipped; the second fails and is handled.",
      code: 'for text in ["42", "forty-two"]:\n    try:\n        number = int(text)\n        print("parsed", number)\n    except ValueError:\n        print("not a number:", repr(text))',
    },
    {
      title: "The exception object",
      text: "`as error` gives access to the type and the message.",
      code: 'try:\n    {"a": 1}["b"]\nexcept KeyError as error:\n    print(type(error).__name__, error)',
    },
    {
      title: "else and finally",
      text: "For good input, `else` runs; for bad input, `except` does. `finally` runs both times.",
      code: 'for text in ["8", "x"]:\n    try:\n        value = int(text)\n    except ValueError:\n        print(text, "-> invalid")\n    else:\n        print(text, "-> doubled:", value * 2)\n    finally:\n        print("checked", text)',
    },
    {
      title: "finally runs even when the error isn't handled",
      text: "There's no `except` for `ZeroDivisionError`, so the error stops the program, but only after `finally` has written its line.",
      code: 'log = []\ntry:\n    log.append("start")\n    result = 10 / 0\nfinally:\n    log.append("end")\n    print(log)',
    },
  ],

  mistakes: [
    {
      title: "A bare except hides a typo",
      text: "`totl` is a typo, so the line raises `NameError`, but the bare `except` treats it like bad input and prints a misleading message.",
      code: 'text = "12"\ntry:\n    amount = float(text)\n    totl = amount * 2\n    print(total)\nexcept:\n    print("Please enter a number")',
      fix: "Catch only what you expect, `except ValueError:`, and keep the `try` block to the line that can fail.",
    },
    {
      title: "Catching the wrong type",
      text: "The handler catches `ValueError`, but a missing key raises `KeyError`, so the error isn't handled.",
      code: 'prices = {"tea": 2.5}\ntry:\n    print(prices["cake"])\nexcept ValueError:\n    print("no price")',
      raises: "KeyError",
      fix: "Catch the exception that actually happens: `except KeyError:`. The traceback tells you its name.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "Parse amounts and count rejects",
      prompt:
        "Write `parse_amounts(texts)`, which converts each text to a float. Return a tuple: the **total** of the amounts that converted, and a **list of the texts** that didn't, in order. Use `try`/`except ValueError` (don't try to check the text's format yourself).",
      looksFor: [
        "Valid numbers (including `\"7\"`, `\"-2.5\"` and `\" 3 \"`) are added to the total.",
        "Texts that `float()` can't convert are returned in a list, in their original order.",
        "Only `ValueError` is caught.",
      ],
      starter: "def parse_amounts(texts):\n    # Return (total, rejected_texts).\n    pass\n",
      task: {
        checks: [
          {
            kind: "function",
            id: "fn",
            name: "parse_amounts",
            compare: { numbers: "int-float-equal" },
            cases: [
              { args: [strs("12.50", "abc", "7", "", "3.25")], expected: py.tuple(f(22.75), strs("abc", "")) },
              { args: [strs("-2.5", " 3 ")], expected: py.tuple(f(0.5), py.list()) },
              { args: [py.list()], expected: py.tuple(i(0), py.list()) },
              { args: [strs("1e3", "1,000", "N/A")], expected: py.tuple(f(1000), strs("1,000", "N/A")), hidden: true },
            ],
            tip: "Inside the loop: try: amount = float(text) / except ValueError: rejected.append(text) / else: total += amount.",
          },
        ],
      },
      hints: [
        "total = 0 and rejected = [] before the loop.",
        "try: amount = float(text). except ValueError: rejected.append(text).",
        "else: total += amount. Return total, rejected.",
      ],
      answer: 'def parse_amounts(texts):\n    """Return (total of valid amounts, list of texts that aren\'t numbers)."""\n    total = 0\n    rejected = []\n    for text in texts:\n        try:\n            amount = float(text)\n        except ValueError:\n            rejected.append(text)\n        else:\n            total += amount\n    return total, rejected',
      wrong: [
        { code: 'def parse_amounts(texts):\n    total = 0\n    rejected = []\n    for text in texts:\n        if text.replace(".", "").isdigit():\n            total += float(text)\n        else:\n            rejected.append(text)\n    return total, rejected\n', fails: ["fn"], why: "format check rejects -2.5 and \" 3 \"" },
        { code: 'def parse_amounts(texts):\n    total = 0\n    rejected = []\n    try:\n        for text in texts:\n            total += float(text)\n    except ValueError:\n        rejected.append(text)\n    return total, rejected\n', fails: ["fn"], why: "try around the whole loop stops at the first bad text" },
      ],
    },
    {
      id: "challenge-2",
      title: "Always close the log",
      prompt:
        "Write `run_batch(values, log)`. It appends `\"start\"` to the `log` list, then returns the sum of `100 / v` for every value. Whatever happens, even if a value is 0 and the division fails, it must append `\"end\"` to `log` before finishing. Don't catch the error: a `ZeroDivisionError` must still reach the caller. Use `finally`.",
      looksFor: [
        "`log` gets `\"start\"`, then `\"end\"`, for every call.",
        "The function returns the sum when all values are non-zero.",
        "A zero value still raises `ZeroDivisionError` to the caller, after `\"end\"` is logged.",
      ],
      starter: "def run_batch(values, log):\n    # Log start, compute, and always log end.\n    pass\n",
      task: {
        checks: [
          { kind: "function", id: "fn", name: "run_batch", compare: { numbers: "int-float-equal" }, cases: [{ args: [py.list(i(4), i(5)), py.list()], expected: f(45) }, { args: [py.list(i(0)), py.list()], raises: "ZeroDivisionError" }, { args: [py.list(), py.list()], expected: i(0), hidden: true }] },
          { kind: "expr", id: "log-ok", label: "Logs start and end on success", show: "log = []; run_batch([4, 5], log); log", expr: "log = []\nrun_batch([4, 5], log)\nresult = log", expected: strs("start", "end") },
          {
            kind: "expr",
            id: "log-error",
            label: "Logs end even when a division fails",
            show: "log = []; run_batch([2, 0], log) (raises); log",
            expr: "log = []\ntry:\n    run_batch([2, 0], log)\nexcept ZeroDivisionError:\n    pass\nresult = log",
            expected: strs("start", "end"),
            tip: "Put the calculation in try: and log.append(\"end\") in finally:, with no except.",
          },
        ],
      },
      hints: [
        'log.append("start") first.',
        "try: compute and return the sum. finally: log.append(\"end\").",
        "No except block: the error should still reach the caller after finally runs.",
      ],
      answer: 'def run_batch(values, log):\n    """Return the sum of 100 / v for each value, logging start and end."""\n    log.append("start")\n    try:\n        return sum(100 / v for v in values)\n    finally:\n        log.append("end")',
      alternatives: ['def run_batch(values, log):\n    log.append("start")\n    try:\n        total = 0\n        for v in values:\n            total += 100 / v\n    finally:\n        log.append("end")\n    return total\n'],
      wrong: [
        { code: 'def run_batch(values, log):\n    log.append("start")\n    total = sum(100 / v for v in values)\n    log.append("end")\n    return total\n', fails: ["log-error"], why: "end not logged on failure" },
        { code: 'def run_batch(values, log):\n    log.append("start")\n    try:\n        return sum(100 / v for v in values)\n    except ZeroDivisionError:\n        return None\n    finally:\n        log.append("end")\n', fails: ["fn"], why: "swallows the error" },
      ],
    },
  ],

  quiz: [
    {
      id: "flow",
      prompt: "What does this program print?",
      code: 'try:\n    x = int("5")\nexcept ValueError:\n    print("A")\nelse:\n    print("B")\nfinally:\n    print("C")\nprint("D")',
      options: [
        { text: "`B`, `C`, `D`", correct: true, why: "The conversion works, so `except` is skipped and `else` runs; `finally` always runs; then the program continues." },
        { text: "`A`, `C`, `D`", why: "`int(\"5\")` succeeds, so the `except` block doesn't run." },
        { text: "`B`, `D`", why: "`finally` runs whether or not there was an error." },
        { text: "`C`, `D`", why: "`else` runs when the `try` block raised nothing." },
      ],
    },
    {
      id: "specific",
      prompt: "Why catch `except ValueError:` rather than a bare `except:` around `float(text)`?",
      options: [
        { text: "A bare except would also hide unrelated bugs, such as a typo's `NameError`", correct: true, why: "Catch only the errors you expect and know how to handle; let the rest show themselves." },
        { text: "A bare except doesn't catch `ValueError`", why: "It catches everything, including `ValueError`; that's the problem." },
        { text: "`except ValueError:` is faster", why: "Speed isn't the reason; correctness and readability are." },
        { text: "A bare except is a syntax error", why: "It's valid Python, just a bad habit." },
      ],
    },
  ],

  outcomes: [
    "Handle expected errors with `try`/`except`, catching specific types.",
    "Use the exception object for its type and message.",
    "Put the success path in `else` and clean-up in `finally`.",
    "Keep `try` blocks small and never silence errors with `except: pass`.",
  ],
};
