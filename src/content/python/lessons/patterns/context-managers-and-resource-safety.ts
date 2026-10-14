import { py } from "@/engine/python/values";
import type { PyLesson } from "../../types";

const s = py.str;
const i = py.int;
const strs = (...xs: string[]) => py.list(...xs.map(s));

export const contextManagersAndResourceSafety: PyLesson = {
  slug: "context-managers-and-resource-safety",
  ref: "python:context-managers-and-resource-safety",
  module: "patterns",
  number: 5,
  title: "Context managers and resource safety",
  level: "advanced",
  summary:
    "Understand what `with` guarantees, and write your own context managers, with `contextlib.contextmanager` or a class with `__enter__` and `__exit__`, so set-up is always matched by clean-up, even when the code inside fails.",

  sections: [
    {
      label: "what with guarantees",
      blocks: [
        {
          kind: "p",
          text: "A `with` statement pairs a set-up with a clean-up. `with open(...) as f:` opens the file, runs the block, and **always** closes the file afterwards: when the block finishes, when it `return`s, and when it raises. It's a tidier and safer form of `try`/`finally`.",
        },
        {
          kind: "p",
          text: "The same need appears everywhere: closing files and network connections, releasing locks, restoring a setting you changed temporarily, committing or rolling back a group of changes. An object that supports `with` is a **context manager**.",
        },
      ],
    },
    {
      label: "@contextmanager",
      blocks: [
        {
          kind: "p",
          text: "The easiest way to write one is a generator decorated with `contextlib.contextmanager`. Code before the `yield` is the set-up, the yielded value is what `as` receives, and code after the `yield` is the clean-up. Put the `yield` in `try`/`finally` so the clean-up runs even if the block raises.",
        },
        { kind: "code", code: 'from contextlib import contextmanager\n\n@contextmanager\ndef logged(log, name):\n    log.append(f"start {name}")\n    try:\n        yield\n    finally:\n        log.append(f"end {name}")' },
      ],
    },
    {
      label: "a class with __enter__ and __exit__",
      blocks: [
        {
          kind: "p",
          text: "A class can be a context manager too: `__enter__(self)` runs at the start and returns the `as` value; `__exit__(self, exc_type, exc, tb)` runs at the end. If the block raised, the three arguments describe the exception (otherwise they're `None`). Returning `False` (or nothing) lets the exception carry on to the caller; returning `True` would swallow it, which is almost never what you want.",
        },
        {
          kind: "p",
          text: "A classic use is a **transaction**: make changes on a copy, and only apply them if the whole block succeeds. If anything fails, `__exit__` throws the copy away, so the data is never left half-changed.",
        },
      ],
    },
  ],

  example: {
    caption: "A logging context manager, and clean-up running despite an error. Press Run to execute it with real Python; running examples never affects your progress.",
    code: 'from contextlib import contextmanager\n\n\n@contextmanager\ndef logged(log, name):\n    log.append(f"start {name}")\n    try:\n        yield\n    finally:\n        log.append(f"end {name}")\n\n\nlog = []\nwith logged(log, "import"):\n    log.append("working")\n\ntry:\n    with logged(log, "export"):\n        raise ValueError("disk full")\nexcept ValueError as error:\n    log.append(f"handled: {error}")\n\nfor line in log:\n    print(line)',
  },

  walkthrough: [
    {
      title: "with closes the file even after an error",
      text: "The block raises, but by the time the error is handled the file is already closed.",
      code: 'try:\n    with open("data.txt", "w", encoding="utf-8") as f:\n        f.write("partial\\n")\n        raise RuntimeError("stopped halfway")\nexcept RuntimeError:\n    pass\nprint(f.closed)\nwith open("data.txt", encoding="utf-8") as f:\n    print(repr(f.read()))',
    },
    {
      title: "The yielded value is what as receives",
      text: "The set-up runs, the block uses the yielded value, then the clean-up runs.",
      code: 'from contextlib import contextmanager\n\n@contextmanager\ndef temporary_setting(settings, key, value):\n    old = settings[key]\n    settings[key] = value\n    try:\n        yield settings\n    finally:\n        settings[key] = old\n\nconfig = {"currency": "GBP"}\nwith temporary_setting(config, "currency", "EUR") as c:\n    print("inside:", c["currency"])\nprint("after:", config["currency"])',
    },
    {
      title: "__enter__ and __exit__",
      text: "`__exit__` is told about the exception, and returning `False` lets it continue to the caller.",
      code: 'class Tracker:\n    def __init__(self, log):\n        self.log = log\n    def __enter__(self):\n        self.log.append("enter")\n        return self\n    def __exit__(self, exc_type, exc, tb):\n        self.log.append(f"exit ({exc_type.__name__ if exc_type else \'no error\'})")\n        return False\n\nlog = []\nwith Tracker(log):\n    log.append("ok")\ntry:\n    with Tracker(log):\n        1 / 0\nexcept ZeroDivisionError:\n    log.append("caller saw the error")\nprint(log)',
    },
    {
      title: "All or nothing",
      text: "Changes happen on a copy; only a block that finishes without an error applies them.",
      code: 'class Transaction:\n    def __init__(self, data):\n        self.data = data\n    def __enter__(self):\n        self.draft = dict(self.data)\n        return self.draft\n    def __exit__(self, exc_type, exc, tb):\n        if exc_type is None:\n            self.data.clear()\n            self.data.update(self.draft)\n        return False\n\nstock = {"lamp": 3, "desk": 1}\ntry:\n    with Transaction(stock) as draft:\n        draft["lamp"] -= 2\n        draft["desk"] -= 2\n        if draft["desk"] < 0:\n            raise ValueError("not enough desks")\nexcept ValueError:\n    pass\nprint(stock)',
    },
  ],

  mistakes: [
    {
      title: "Clean-up without finally",
      text: "The block raises, so the line after `yield` never runs, and the log never records the end.",
      code: 'from contextlib import contextmanager\n\n@contextmanager\ndef logged(log):\n    log.append("start")\n    yield\n    log.append("end")\n\nlog = []\ntry:\n    with logged(log):\n        raise ValueError("boom")\nexcept ValueError:\n    pass\nprint(log)',
      fix: "Wrap the `yield` in `try:`/`finally:` so the clean-up always runs.",
    },
    {
      title: "Swallowing errors in __exit__",
      text: "Returning `True` from `__exit__` hides the exception, so the caller never learns the division failed.",
      code: 'class Quiet:\n    def __enter__(self):\n        return self\n    def __exit__(self, exc_type, exc, tb):\n        return True\n\nwith Quiet():\n    result = 1 / 0\nprint("carried on, but result was never set")\nprint(result)',
      raises: "NameError",
      fix: "Return `False` (or nothing) unless suppressing a specific, expected error is really the point.",
    },
  ],

  challenges: [
    {
      id: "challenge-1",
      title: "A context manager that always logs",
      prompt:
        "Write a context manager `logged(log, name)` with `@contextmanager`. On entry it appends `\"start <name>\"` to the list `log`; on exit it appends `\"end <name>\"`, **even if the block raised**. Exceptions must still reach the caller. It should yield `name`, so `with logged(log, \"x\") as n:` gives `n == \"x\"`.",
      looksFor: [
        "A normal block logs `start …` then `end …`.",
        "A block that raises still logs `end …`, and the exception reaches the caller.",
        "The yielded value is the name.",
      ],
      starter: "from contextlib import contextmanager\n\n\n# Write logged(log, name) here.\n",
      task: {
        checks: [
          { kind: "expr", id: "normal", label: "Logs start and end around a normal block", show: 'with logged(log, "import") as n: log.append(n)', expr: 'log = []\nwith logged(log, "import") as n:\n    log.append(n)\nresult = log', expected: strs("start import", "import", "end import") },
          { kind: "expr", id: "error", label: "Logs end even when the block raises", show: 'with logged(log, "export"): raise ValueError', expr: 'log = []\ntry:\n    with logged(log, "export"):\n        raise ValueError("boom")\nexcept ValueError:\n    log.append("caller saw it")\nresult = log', expected: strs("start export", "end export", "caller saw it"), tip: "Put the yield inside try:, and the end entry in finally:. Don't catch the exception." },
        ],
      },
      hints: [
        "@contextmanager above def logged(log, name):.",
        'log.append(f"start {name}"), then try: yield name.',
        'finally: log.append(f"end {name}").',
      ],
      answer: 'from contextlib import contextmanager\n\n\n@contextmanager\ndef logged(log, name):\n    """Log the start and end of a block, even if it fails."""\n    log.append(f"start {name}")\n    try:\n        yield name\n    finally:\n        log.append(f"end {name}")',
      wrong: [
        { code: 'from contextlib import contextmanager\n\n@contextmanager\ndef logged(log, name):\n    log.append(f"start {name}")\n    yield name\n    log.append(f"end {name}")\n', fails: ["error"], why: "no finally" },
        { code: 'from contextlib import contextmanager\n\n@contextmanager\ndef logged(log, name):\n    log.append(f"start {name}")\n    try:\n        yield name\n    except Exception:\n        pass\n    finally:\n        log.append(f"end {name}")\n', fails: ["error"], why: "swallows the exception" },
      ],
    },
    {
      id: "challenge-2",
      title: "An all-or-nothing stock update",
      prompt:
        "Write a class `Transaction` used as `with Transaction(stock) as draft:`. `__enter__` returns a **copy** of the `stock` dictionary to change. When the block finishes without an error, `__exit__` copies the draft's contents back into the original dictionary (the same object, so other references see it). If the block raises, the original is left exactly as it was, and the exception carries on to the caller.",
      looksFor: [
        "Successful blocks update the original dictionary in place.",
        "A block that raises leaves the original unchanged.",
        "The exception still reaches the caller.",
      ],
      starter: "class Transaction:\n    # __init__, __enter__ and __exit__.\n    pass\n",
      task: {
        checks: [
          { kind: "expr", id: "commit", label: "A successful block updates the original", show: 'stock = {"lamp": 3}; with Transaction(stock) as d: d["lamp"] -= 1', expr: 'stock = {"lamp": 3, "desk": 1}\nsame = stock\nwith Transaction(stock) as draft:\n    draft["lamp"] -= 1\n    draft["rug"] = 2\nresult = (same, same is stock)', expected: py.tuple(py.dict([[s("lamp"), i(2)], [s("desk"), i(1)], [s("rug"), i(2)]]), py.bool(true)), tip: "In __exit__ with no error: self.data.clear() and self.data.update(self.draft), changing the original object." },
          { kind: "expr", id: "rollback", label: "A failing block leaves the original unchanged", show: 'with Transaction(stock) as d: d["lamp"] = 0; raise ValueError', expr: 'stock = {"lamp": 3}\ntry:\n    with Transaction(stock) as draft:\n        draft["lamp"] = 0\n        raise ValueError("cancelled")\nexcept ValueError:\n    pass\nresult = stock', expected: py.dict([[s("lamp"), i(3)]]), tip: "Make the draft a copy in __enter__ (dict(self.data)), so changes don't touch the original until commit." },
          { kind: "expr", id: "propagates", label: "The exception reaches the caller", show: "the ValueError raised inside the block", expr: 'try:\n    with Transaction({}) as draft:\n        raise ValueError("cancelled")\n    result = "swallowed"\nexcept ValueError:\n    result = "raised"', expected: s("raised"), tip: "Return False from __exit__." },
        ],
      },
      hints: [
        "__init__(self, data): self.data = data. __enter__: self.draft = dict(self.data); return self.draft.",
        "__exit__(self, exc_type, exc, tb): if exc_type is None, copy the draft back into self.data.",
        "Copy back with self.data.clear() then self.data.update(self.draft); return False at the end.",
      ],
      answer: 'class Transaction:\n    """Apply changes to a dict only if the whole with block succeeds."""\n\n    def __init__(self, data):\n        self.data = data\n\n    def __enter__(self):\n        self.draft = dict(self.data)\n        return self.draft\n\n    def __exit__(self, exc_type, exc, tb):\n        if exc_type is None:\n            self.data.clear()\n            self.data.update(self.draft)\n        return False',
      wrong: [
        { code: "class Transaction:\n    def __init__(self, data):\n        self.data = data\n    def __enter__(self):\n        return self.data\n    def __exit__(self, exc_type, exc, tb):\n        return False\n", fails: ["rollback"], why: "edits the original directly" },
        { code: "class Transaction:\n    def __init__(self, data):\n        self.data = data\n    def __enter__(self):\n        self.draft = dict(self.data)\n        return self.draft\n    def __exit__(self, exc_type, exc, tb):\n        if exc_type is None:\n            self.data = self.draft\n        return True\n", fails: ["commit", "propagates"], why: "rebinds instead of updating, and swallows errors" },
      ],
    },
  ],

  quiz: [
    {
      id: "order",
      prompt: "What does this program print?",
      code: 'from contextlib import contextmanager\n\n@contextmanager\ndef tag(name):\n    print("<" + name + ">")\n    try:\n        yield\n    finally:\n        print("</" + name + ">")\n\nwith tag("b"):\n    print("bold")',
      options: [
        { text: "`<b>`, `bold`, `</b>`", correct: true, why: "Code before `yield` runs on entry, the block runs, then the `finally` part runs on exit." },
        { text: "`bold`, `<b>`, `</b>`", why: "The set-up before `yield` runs before the block." },
        { text: "`<b>`, `</b>`, `bold`", why: "The clean-up after `yield` waits until the block has finished." },
        { text: "`<b>`, `bold`", why: "The `finally` clean-up always runs when the block ends." },
      ],
    },
    {
      id: "exit-true",
      prompt: "What does returning `True` from `__exit__` do when the block raised?",
      options: [
        { text: "It suppresses the exception, so the caller never sees it", correct: true, why: "That's occasionally intended, but usually it hides real failures. Return `False` to let the error continue." },
        { text: "It re-raises the exception", why: "Returning a false value lets it continue; `True` stops it." },
        { text: "It retries the block", why: "Context managers don't retry; the block has already finished." },
        { text: "Nothing: the return value is ignored", why: "For `__exit__`, a true return value means “I handled the exception”." },
      ],
    },
  ],

  outcomes: [
    "Explain what `with` guarantees, including when the block raises.",
    "Write context managers with `@contextmanager` and `try`/`finally`.",
    "Write a context-manager class with `__enter__` and `__exit__`.",
    "Use a context manager to make a group of changes all-or-nothing.",
  ],
};
