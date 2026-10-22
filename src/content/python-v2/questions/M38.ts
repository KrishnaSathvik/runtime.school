/**
 * M38 practice: ten independent problems on threads, executors, shared state, processes and measured benchmarks
 * (PY-L38-01 … PY-L38-05).
 *
 * Python in the browser has no threads or child processes, so every problem is written against injected
 * collaborators: a thread class (the checker's stand-in logs start/join and runs the target at join), an Executor
 * (the checker's runs each call when submitted: real Futures, no concurrency), recording locks with a dictionary that
 * counts unguarded access, and a map function that pickles like a process pool. On a computer the same functions run
 * with threading.Thread, ThreadPoolExecutor and ProcessPoolExecutor; the reference answers were run that way on
 * CPython 3.14. Benchmark questions analyse timings measured on real CPython, never timings taken here.
 * Mix: 5 function implementations, 2 debugging (a lock created per call, lock-ordering deadlock), 1 validation
 * (picklability pre-flight), 2 output predictions. Easy: 02, 03, 06, 10. Medium: 12, 13, 16, 19. Hard: 20, 22.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase } from "../checks";
import { py } from "@/engine/python/values";
import { GUARDED, INLINE_EXECUTOR, STEP_THREAD } from "../lessons/M38";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const yes = py.bool(true);
const strs = (...xs: string[]) => py.list(...xs.map((x) => py.str(x)));

/** Queue.get on an empty queue would block the single browser thread forever; checks make it raise instead. */
const SAFE_QUEUE = [
  "import queue as _q",
  "if not hasattr(_q.Queue, '_m38_get'):",
  "    _q.Queue._m38_get = _q.Queue.get",
  "    def _safe_get(self, block=True, timeout=None):",
  "        if self.empty():",
  "            raise RuntimeError('worker waiting on an empty queue forever')",
  "        return _q.Queue._m38_get(self, block, timeout)",
  "    _q.Queue.get = _safe_get",
].join("\n");

export const m38Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q38-02",
    version: 2,
    slug: "predict-futures",
    title: "Predict: futures that hold results and errors",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 6,
    requires: ["arithmetic", "assignment", "class-def", "dict-literal", "dict-lookup", "except-type", "function-def", "function-param", "function-return", "import-module", "list-comp", "list-index", "list-literal", "membership", "method-def", "package-import", "pool-submit", "print-call", "self-name", "star-args", "star-kwargs", "string-index", "subclass", "top-level-indent", "try-except", "type-call", "with-statement"],
    prompt: "Three order lines are priced through an executor (one that runs each call as it is submitted). One line has a quantity of 0. Type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "A failing call doesn't raise at `submit`: its exception is stored in the future.",
      "`exception()` returns `None` for a call that succeeded; `type(None).__name__` is `NoneType`.",
      "Only the failed future would raise on `result()`; the program only asks the other two.",
    ],
    explanation: "All three futures are done. The middle one holds a `ZeroDivisionError` (31.0 / 0); the others hold `None` as their exception and their results 14.98 / 2 = 7.49 and 9.0 / 3 = 3.0.",
    predict: {
      program: src`
from concurrent.futures import Executor, Future

class InlineExecutor(Executor):
    def submit(self, fn, *args, **kwargs):
        future = Future()
        try:
            future.set_result(fn(*args, **kwargs))
        except Exception as error:
            future.set_exception(error)
        return future

def unit_price(line):
    return line["total"] / line["qty"]

lines = [{"total": 14.98, "qty": 2}, {"total": 31.0, "qty": 0}, {"total": 9.0, "qty": 3}]
with InlineExecutor() as executor:
    futures = [executor.submit(unit_price, line) for line in lines]
    print([f.done() for f in futures])
    print([type(f.exception()).__name__ for f in futures])
    print(futures[0].result(), futures[2].result())
`,
      output: "[True, True, True]\n['NoneType', 'ZeroDivisionError', 'NoneType']\n7.49 3.0\n",
      wrongPredictions: [
        "[True, False, True]\n['NoneType', 'ZeroDivisionError', 'NoneType']\n7.49 3.0\n",
        "[True, True, True]\n[None, 'ZeroDivisionError', None]\n7.49 3.0\n",
        "[True, True, True]\n['NoneType', 'ZeroDivisionError', 'NoneType']\n7.49 3\n",
        "ZeroDivisionError\n",
      ],
    },
  },
  {
    id: "PY-Q38-03",
    version: 2,
    slug: "lock-per-call",
    title: "Fix the lock that protects nothing",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "dict-get", "dict-literal", "finally-clause", "for-loop", "function-def", "function-default", "function-param", "import-module", "init-method", "list-mutate", "membership", "method-def", "plain-class", "print-call", "self-name", "string-index", "top-level-indent", "try-except", "with-statement"],
    prompt: "A page-view counter is updated from many web-server threads and still loses views under load, although `record` uses `with` and a lock. Find why the lock protects nothing and fix it.",
    spec: [
      ["Class", "`PageViews(lock_factory=threading.Lock)` with `counts` (a dictionary) and `record(page)`"],
      ["record(page)", "adds 1 to `counts[page]` (missing pages start at 0) while holding the counter's lock"],
      ["Rule", "the counter creates **one** lock (with `lock_factory()`) and every update uses it"],
    ],
    hiddenKinds: ["many updates share one lock", "every access to counts holds the lock"],
    hints: [
      "How many lock objects exist after three calls to `record`?",
      "Each thread that creates its own lock can always acquire it, so nobody ever waits.",
      "Create the lock once in `__init__` and use that same lock in `record`.",
    ],
    explanation: "`with self.lock_factory():` makes a brand-new lock on every call, which no other thread knows about, so two threads both get in. A lock only works if everyone uses the same object: create it once in `__init__` (`self.lock = lock_factory()`) and use `with self.lock:` around the whole read-modify-write.",
    code: {
      starter: src`
import threading

class PageViews:
    def __init__(self, lock_factory=threading.Lock):
        self.counts = {}
        self.lock_factory = lock_factory

    def record(self, page):
        with self.lock_factory():
            self.counts[page] = self.counts.get(page, 0) + 1

views = PageViews()
for page in ["/products", "/cart", "/products"]:
    views.record(page)
print(views.counts)
`,
      answer: src`
import threading

class PageViews:
    def __init__(self, lock_factory=threading.Lock):
        self.counts = {}
        self.lock = lock_factory()

    def record(self, page):
        with self.lock:
            self.counts[page] = self.counts.get(page, 0) + 1

views = PageViews()
for page in ["/products", "/cart", "/products"]:
    views.record(page)
print(views.counts)
`,
      alternatives: [
        src`
import threading

class PageViews:
    def __init__(self, lock_factory=threading.Lock):
        self.counts = {}
        self._lock = lock_factory()

    def record(self, page):
        self._lock.acquire()
        try:
            self.counts[page] = self.counts.get(page, 0) + 1
        finally:
            self._lock.release()
`,
      ],
      wrong: [
        {
          code: src`
import threading

class PageViews:
    def __init__(self, lock_factory=threading.Lock):
        self.counts = {}
        self.lock = lock_factory()

    def record(self, page):
        current = self.counts.get(page, 0)
        with self.lock:
            self.counts[page] = current + 1
`,
          fails: ["guarded"],
          why: "one shared lock now, but the read happens before it is acquired",
        },
        {
          code: src`
import threading

class PageViews:
    def __init__(self, lock_factory=threading.Lock):
        self.counts = {}
        self.lock_factory = lock_factory

    def record(self, page):
        lock = self.lock_factory()
        with lock:
            self.counts[page] = self.counts.get(page, 0) + 1
`,
          fails: ["one-lock"],
          why: "moving the creation to its own line still makes a new lock per call",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "counts",
            label: "record() counts views per page",
            show: "record /products, /cart, /products",
            expr: "_v = PageViews()\nfor _p in ['/products', '/cart', '/products']:\n    _v.record(_p)\nresult = _v.counts",
            expected: py.dict([[py.str("/products"), py.int(2)], [py.str("/cart"), py.int(1)]]),
          },
          {
            kind: "expr",
            id: "one-lock",
            label: "many updates share one lock",
            hidden: true,
            expr: "_made = [0]\ndef _factory():\n    import threading as _th\n    _made[0] += 1\n    return _th.Lock()\n_v = PageViews(lock_factory=_factory)\nfor _ in range(5):\n    _v.record('/a')\nresult = _made[0]",
            expected: py.int(1),
          },
          {
            kind: "expr",
            id: "guarded",
            label: "every access to counts holds the lock",
            hidden: true,
            expr: `${GUARDED}\n_lk = _RecLock()\n_Guarded.lock = _lk\n_v = PageViews(lock_factory=lambda: _lk)\n_v.counts = _Guarded()\n_v.record('/a')\n_v.record('/a')\nresult = [dict(_v.counts), _Guarded.unguarded]`,
            expected: py.list(py.dict([[py.str("/a"), py.int(2)]]), py.int(0)),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q38-06",
    version: 2,
    slug: "threads-in-batches",
    title: "Send notifications in batches of threads",
    format: "integration",
    difficulty: "easy",
    minutes: 12,
    requires: ["arithmetic", "assignment", "for-loop", "function-def", "function-default", "function-param", "function-return", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "membership", "nested-loop", "range-call", "string-slice", "top-level-indent", "tuple-literal"],
    prompt: "The SMS provider allows at most `batch_size` requests at once. Write `notify_in_batches(customers, send, batch_size, make_thread=threading.Thread)`: start one thread per customer for the first `batch_size` customers, join them all, then do the next batch, and so on.",
    spec: [
      ["Function", "`notify_in_batches(customers, send, batch_size, make_thread=threading.Thread)`"],
      ["Rule", "within a batch, start every thread before joining any; never start the next batch before the current one is joined"],
      ["Returns", "the number of batches run"],
    ],
    hiddenKinds: ["a last, smaller batch", "a batch size larger than the list", "no customers"],
    hints: [
      "Slice the customers into groups of `batch_size` (a `range` with a step does it).",
      "For each group: create and start its threads, keeping them in a list, then join that list.",
      "Count the groups as you go.",
    ],
    explanation: "Slicing `customers[i:i + batch_size]` for `i` in steps of `batch_size` gives the batches. Within each, all threads start before any join, so up to `batch_size` sends overlap; joining before the next batch keeps the provider's limit. A thread pool with `max_workers=batch_size` (“Executors and futures”) achieves a similar limit with less code.",
    code: {
      starter: src`
import threading

def notify_in_batches(customers, send, batch_size, make_thread=threading.Thread):
    return 0
`,
      answer: src`
import threading

def notify_in_batches(customers, send, batch_size, make_thread=threading.Thread):
    batches = 0
    for start in range(0, len(customers), batch_size):
        threads = []
        for customer in customers[start:start + batch_size]:
            thread = make_thread(target=send, args=(customer,))
            thread.start()
            threads.append(thread)
        for thread in threads:
            thread.join()
        batches += 1
    return batches
`,
      alternatives: [
        src`
import threading

def notify_in_batches(customers, send, batch_size, make_thread=threading.Thread):
    groups = [customers[i:i + batch_size] for i in range(0, len(customers), batch_size)]
    for group in groups:
        workers = [make_thread(target=send, args=(c,)) for c in group]
        for w in workers:
            w.start()
        for w in workers:
            w.join()
    return len(groups)
`,
      ],
      wrong: [
        {
          code: src`
import threading

def notify_in_batches(customers, send, batch_size, make_thread=threading.Thread):
    threads = [make_thread(target=send, args=(c,)) for c in customers]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return (len(customers) + batch_size - 1) // batch_size
`,
          fails: ["order", "tail"],
          why: "every thread starts at once, ignoring the provider's limit",
        },
        {
          code: src`
import threading

def notify_in_batches(customers, send, batch_size, make_thread=threading.Thread):
    batches = 0
    for start in range(0, len(customers), batch_size):
        for customer in customers[start:start + batch_size]:
            thread = make_thread(target=send, args=(customer,))
            thread.start()
            thread.join()
        batches += 1
    return batches
`,
          fails: ["order", "tail", "big"],
          why: "each thread is joined right after starting, so nothing overlaps",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "order",
            label: "batches of two: start, start, join, join, then the next batch",
            show: "notify_in_batches(['C1', 'C2', 'C3', 'C4'], send, 2, make_thread=StepThread)",
            expr: `${STEP_THREAD}\n_sent = []\n_n = notify_in_batches(['C1', 'C2', 'C3', 'C4'], _sent.append, 2, make_thread=_StepThread)\nresult = [_n, _log, _sent]`,
            expected: py.list(py.int(2), strs("start", "start", "join", "join", "start", "start", "join", "join"), strs("C1", "C2", "C3", "C4")),
          },
          {
            kind: "expr",
            id: "tail",
            label: "a last, smaller batch",
            hidden: true,
            expr: `${STEP_THREAD}\n_sent = []\n_n = notify_in_batches(['a', 'b', 'c'], _sent.append, 2, make_thread=_StepThread)\nresult = [_n, _log, len(_sent)]`,
            expected: py.list(py.int(2), strs("start", "start", "join", "join", "start", "join"), py.int(3)),
          },
          {
            kind: "expr",
            id: "big",
            label: "a batch size larger than the list",
            hidden: true,
            expr: `${STEP_THREAD}\n_n = notify_in_batches(['a', 'b'], len, 10, make_thread=_StepThread)\nresult = [_n, _log]`,
            expected: py.list(py.int(1), strs("start", "start", "join", "join")),
          },
          {
            kind: "expr",
            id: "none",
            label: "no customers",
            hidden: true,
            expr: `${STEP_THREAD}\nresult = [notify_in_batches([], len, 3, make_thread=_StepThread), _log]`,
            expected: py.list(py.int(0), py.list()),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q38-10",
    version: 2,
    slug: "amdahl-limit",
    title: "How fast can it get? Amdahl's law",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: ["arithmetic", "assignment", "conversion", "function-def", "function-param", "function-return", "precedence", "print-call", "print-several", "top-level-indent"],
    prompt: "Before parallelising a report, estimate the best possible speed-up. If a fraction `p` of the serial run time can be split across `workers` and the rest can't, the speed-up is at most `1 / ((1 - p) + p / workers)` (Amdahl's law). Write `max_speedup(parallel_fraction, workers)`.",
    spec: [
      ["Function", "`max_speedup(parallel_fraction, workers)`"],
      ["Inputs", "a fraction from 0 to 1, and a whole number of workers ≥ 1"],
      ["Returns", "the speed-up limit as a float"],
    ],
    hiddenKinds: ["nothing parallel", "everything parallel", "one worker"],
    hints: [
      "The serial part takes `1 - p` of the original time whatever you do.",
      "The parallel part takes `p / workers` of it.",
      "The speed-up is 1 divided by the sum of the two.",
    ],
    explanation: "Normalising the serial run to 1, the new run takes `(1 - p) + p / workers`, and the speed-up is its inverse. With 90% parallel work and 8 workers the limit is about 4.7×, which is why the measured cpu workload (×3.4 on 8 processes) is reasonable: the serial parts and overheads cap it.",
    code: {
      starter: src`
def max_speedup(parallel_fraction, workers):
    return float(workers)

print(max_speedup(0.9, 8))
`,
      answer: src`
def max_speedup(parallel_fraction, workers):
    serial_part = 1 - parallel_fraction
    parallel_part = parallel_fraction / workers
    return 1 / (serial_part + parallel_part)

print(max_speedup(0.9, 8))
`,
      alternatives: [
        src`
def max_speedup(parallel_fraction, workers):
    return workers / (workers * (1 - parallel_fraction) + parallel_fraction)
`,
      ],
      wrong: [
        {
          code: src`
def max_speedup(parallel_fraction, workers):
    return parallel_fraction * workers
`,
          fails: ["returns"],
          why: "multiplying ignores the serial part that doesn't shrink",
        },
        {
          code: src`
def max_speedup(parallel_fraction, workers):
    return 1 / (1 - parallel_fraction + parallel_fraction * workers)
`,
          fails: ["returns"],
          why: "the parallel part must be divided by the workers, not multiplied",
        },
      ],
      task: {
        checks: [
          fn("returns", "max_speedup", [
            example([0.9, 8], 1 / (0.1 + 0.9 / 8)),
            example([0.5, 8], 1 / (0.5 + 0.5 / 8)),
            example([1, 4], py.float(4)),
            hiddenCase("nothing parallel", [0, 16], py.float(1)),
            hiddenCase("one worker", [0.75, 1], py.float(1)),
            hiddenCase("almost all parallel, many workers", [0.99, 100], 1 / (0.01 + 0.99 / 100)),
          ], { label: "max_speedup() applies Amdahl's law" }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q38-12",
    version: 2,
    slug: "predict-map-stops",
    title: "Predict: executor.map meets an exception",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 6,
    requires: ["arithmetic", "assignment", "class-def", "dict-literal", "dict-lookup", "except-type", "for-loop", "function-def", "function-param", "function-return", "import-module", "list-index", "list-literal", "map-call", "membership", "method-def", "package-import", "pool-submit", "print-call", "print-text", "self-name", "star-args", "star-kwargs", "string-index", "subclass", "top-level-indent", "try-except", "unquoted-name", "with-statement"],
    prompt: "The same three order lines go through `executor.map`. Type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`map` yields results in input order.",
      "When it reaches a call that raised, iterating re-raises that exception.",
      "The loop stops there; later results are never printed.",
    ],
    explanation: "The first result (7.49) prints. The second call raised ZeroDivisionError, which `map` re-raises when the loop asks for it, so control jumps to the `except` and `stopped` prints; the third result is never reached even though it was computed.",
    predict: {
      program: src`
from concurrent.futures import Executor, Future

class InlineExecutor(Executor):
    def submit(self, fn, *args, **kwargs):
        future = Future()
        try:
            future.set_result(fn(*args, **kwargs))
        except Exception as error:
            future.set_exception(error)
        return future

def unit_price(line):
    return line["total"] / line["qty"]

lines = [{"total": 14.98, "qty": 2}, {"total": 31.0, "qty": 0}, {"total": 9.0, "qty": 3}]
with InlineExecutor() as executor:
    try:
        for price in executor.map(unit_price, lines):
            print(price)
    except ZeroDivisionError:
        print("stopped")
`,
      output: "7.49\nstopped\n",
      wrongPredictions: ["7.49\nstopped\n3.0\n", "7.49\n3.0\n", "stopped\n", "7.49\nNone\n3.0\n"],
    },
  },
  {
    id: "PY-Q38-13",
    version: 2,
    slug: "lock-ordering-deadlock",
    title: "Fix the transfer that can deadlock",
    format: "debugging",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "boolean", "comparison", "dict-literal", "dict-lookup", "else-clause", "function-def", "function-param", "function-return", "if-statement", "import-module", "lambda", "list-index", "list-literal", "list-sort", "print-call", "print-several", "reassignment", "sort-key", "string-index", "thread-lock", "top-level-indent", "tuple-unpack", "with-statement"],
    prompt: "Store-credit transfers lock both accounts. Occasionally the server freezes: one thread runs `transfer(a, b, …)` while another runs `transfer(b, a, …)`; each holds one lock and waits forever for the other. Fix `transfer` so locks are always taken in the same global order (by account ID), whatever the direction.",
    spec: [
      ["Function", "`transfer(source, target, amount)`; each account is a dictionary with `\"id\"`, `\"balance\"` and `\"lock\"`"],
      ["Effect", "moves `amount` from source to target while holding both locks; returns `True`, or `False` without changes if the source has too little"],
      ["Rule", "always acquire the lock of the account with the smaller `id` first"],
    ],
    hiddenKinds: ["a transfer in the opposite direction", "insufficient balance", "locks released afterwards"],
    hints: [
      "A deadlock needs two threads waiting for each other's lock in opposite order.",
      "If every thread takes the locks in the same order, that cycle can't form.",
      "Sort the two accounts by `id` and nest the `with` blocks in that order.",
    ],
    explanation: "Taking locks in argument order lets transfer(a, b) hold a's lock while transfer(b, a) holds b's: each waits for the other forever. Ordering the acquisitions by a global key (the account ID) makes the opposite-direction transfer also lock `a` first, so one of the two simply waits its turn.",
    code: {
      starter: src`
import threading

def transfer(source, target, amount):
    with source["lock"]:
        with target["lock"]:
            if source["balance"] < amount:
                return False
            source["balance"] -= amount
            target["balance"] += amount
            return True

a = {"id": "C00077", "balance": 50, "lock": threading.Lock()}
b = {"id": "C01338", "balance": 10, "lock": threading.Lock()}
print(transfer(b, a, 5), a["balance"], b["balance"])
`,
      answer: src`
import threading

def transfer(source, target, amount):
    first, second = sorted([source, target], key=lambda account: account["id"])
    with first["lock"]:
        with second["lock"]:
            if source["balance"] < amount:
                return False
            source["balance"] -= amount
            target["balance"] += amount
            return True

a = {"id": "C00077", "balance": 50, "lock": threading.Lock()}
b = {"id": "C01338", "balance": 10, "lock": threading.Lock()}
print(transfer(b, a, 5), a["balance"], b["balance"])
`,
      alternatives: [
        src`
def transfer(source, target, amount):
    if source["id"] < target["id"]:
        first, second = source, target
    else:
        first, second = target, source
    with first["lock"], second["lock"]:
        if source["balance"] >= amount:
            source["balance"] -= amount
            target["balance"] += amount
            return True
        return False
`,
      ],
      wrong: [
        {
          code: src`
def transfer(source, target, amount):
    with target["lock"]:
        with source["lock"]:
            if source["balance"] < amount:
                return False
            source["balance"] -= amount
            target["balance"] += amount
            return True
`,
          fails: ["order"],
          why: "swapping the nesting just moves the problem: the order still depends on the direction",
        },
        {
          code: src`
def transfer(source, target, amount):
    first, second = sorted([source, target], key=lambda account: account["id"])
    with first["lock"]:
        with second["lock"]:
            source["balance"] -= amount
            target["balance"] += amount
            return True
`,
          fails: ["moves"],
          why: "the lock order is fixed, but the balance check was lost, so accounts can go negative",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "moves",
            label: "transfer() moves money and refuses overdrafts",
            show: "transfer 5 from C01338 (10) to C00077 (50), then 100",
            expr: "import threading as _th\n_a = {'id': 'C00077', 'balance': 50, 'lock': _th.Lock()}\n_b = {'id': 'C01338', 'balance': 10, 'lock': _th.Lock()}\nresult = [transfer(_b, _a, 5), transfer(_b, _a, 100), _a['balance'], _b['balance']]",
            expected: py.list(yes, py.bool(false), py.int(55), py.int(5)),
          },
          {
            kind: "expr",
            id: "order",
            label: "locks are taken by account ID in both directions",
            hidden: true,
            expr: "_order = []\nclass _L:\n    def __init__(self, name):\n        self.name = name\n    def __enter__(self):\n        _order.append(self.name)\n        return self\n    def __exit__(self, *e):\n        return False\n    def acquire(self, *a, **k):\n        _order.append(self.name)\n        return True\n    def release(self):\n        pass\n_x = {'id': 'A1', 'balance': 9, 'lock': _L('A1')}\n_y = {'id': 'B2', 'balance': 9, 'lock': _L('B2')}\ntransfer(_x, _y, 1)\ntransfer(_y, _x, 1)\nresult = _order",
            expected: strs("A1", "B2", "A1", "B2"),
          },
          {
            kind: "expr",
            id: "released",
            label: "both locks are released afterwards",
            hidden: true,
            expr: "import threading as _th\n_a = {'id': 'A', 'balance': 1, 'lock': _th.Lock()}\n_b = {'id': 'B', 'balance': 1, 'lock': _th.Lock()}\ntransfer(_b, _a, 5)\ntransfer(_a, _b, 1)\nresult = [_a['lock'].locked(), _b['lock'].locked()]",
            expected: py.list(py.bool(false), py.bool(false)),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q38-16",
    version: 2,
    slug: "queue-workers",
    title: "Worker threads fed by a queue",
    format: "integration",
    difficulty: "medium",
    minutes: 18,
    requires: ["assignment", "boolean", "break-statement", "dict-get", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "list-comp", "list-literal", "list-mutate", "list-sort", "logical", "membership", "none-value", "range-call", "reassignment", "string-index", "top-level-indent", "truthiness", "while-loop"],
    prompt: "A thumbnail service runs a fixed number of worker threads that take jobs from a `queue.Queue`. Write `run_workers(jobs, handle, workers, make_thread=threading.Thread)`: put every job on the queue, followed by one `None` per worker as a *stop* signal; each worker loops taking jobs and handling them until it takes a `None`. Return the results sorted.",
    spec: [
      ["Function", "`run_workers(jobs, handle, workers, make_thread=threading.Thread)`"],
      ["Workers", "exactly `workers` threads, all started before any is joined"],
      ["Returns", "a sorted list of `handle(job)` for every job"],
    ],
    hiddenKinds: ["more workers than jobs", "no jobs", "a single worker"],
    hints: [
      "Fill the queue first: the jobs, then `None` once per worker.",
      "The worker function loops: `job = q.get()`; stop when it is `None`; otherwise append `handle(job)` to a shared results list.",
      "Create, start and then join `workers` threads running that function, and sort the results.",
    ],
    explanation: "A `queue.Queue` is safe to share between threads: each `get` hands one item to exactly one worker. One `None` per worker guarantees every worker eventually stops, so every `join` returns. Appending to one list from several threads is safe in CPython; sorting at the end removes any dependence on which worker handled what.",
    code: {
      starter: src`
import queue
import threading

def run_workers(jobs, handle, workers, make_thread=threading.Thread):
    return []
`,
      answer: src`
import queue
import threading

def run_workers(jobs, handle, workers, make_thread=threading.Thread):
    tasks = queue.Queue()
    for job in jobs:
        tasks.put(job)
    for _ in range(workers):
        tasks.put(None)
    results = []

    def worker():
        while True:
            job = tasks.get()
            if job is None:
                break
            results.append(handle(job))

    threads = [make_thread(target=worker) for _ in range(workers)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return sorted(results)
`,
      alternatives: [
        src`
import queue
import threading

def run_workers(jobs, handle, workers, make_thread=threading.Thread):
    q = queue.Queue()
    done = []

    def loop():
        item = q.get()
        while item is not None:
            done.append(handle(item))
            item = q.get()

    pool = []
    for _ in range(workers):
        t = make_thread(target=loop)
        t.start()
        pool.append(t)
    for job in jobs:
        q.put(job)
    for _ in pool:
        q.put(None)
    for t in pool:
        t.join()
    return sorted(done)
`,
      ],
      wrong: [
        {
          code: src`
import queue
import threading

def run_workers(jobs, handle, workers, make_thread=threading.Thread):
    tasks = queue.Queue()
    for job in jobs:
        tasks.put(job)
    tasks.put(None)
    results = []

    def worker():
        while True:
            job = tasks.get()
            if job is None:
                break
            results.append(handle(job))

    threads = [make_thread(target=worker) for _ in range(workers)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return sorted(results)
`,
          fails: ["count", "stops"],
          why: "only one stop signal: every other worker waits on an empty queue forever",
        },
        {
          code: src`
import queue
import threading

def run_workers(jobs, handle, workers, make_thread=threading.Thread):
    results = []
    threads = [make_thread(target=lambda j=j: results.append(handle(j))) for j in jobs]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return sorted(results)
`,
          fails: ["count"],
          why: "one thread per job instead of a fixed number of workers",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "results",
            label: "run_workers() handles every job",
            show: "run_workers([3, 1, 2], double, 2, make_thread=StepThread)",
            expr: `${SAFE_QUEUE}\n${STEP_THREAD}\nresult = run_workers([3, 1, 2], lambda x: x * 2, 2, make_thread=_StepThread)`,
            expected: py.list(py.int(2), py.int(4), py.int(6)),
          },
          {
            kind: "expr",
            id: "count",
            label: "exactly `workers` threads, started before joined",
            hidden: true,
            expr: `${SAFE_QUEUE}\n${STEP_THREAD}\nrun_workers(['a', 'b', 'c', 'd', 'e'], len, 3, make_thread=_StepThread)\nresult = _log`,
            expected: strs("start", "start", "start", "join", "join", "join"),
          },
          {
            kind: "expr",
            id: "stops",
            label: "every worker gets a stop signal (no job left behind, no worker left waiting)",
            hidden: true,
            expr: `${SAFE_QUEUE}\n${STEP_THREAD}\n_out = run_workers([1, 2], lambda x: x, 4, make_thread=_StepThread)\nresult = [_out, [_x for _x in _log if _x.startswith('unhandled')]]`,
            expected: py.list(py.list(py.int(1), py.int(2)), py.list()),
          },
          {
            kind: "expr",
            id: "empty",
            label: "no jobs",
            hidden: true,
            expr: `${SAFE_QUEUE}\n${STEP_THREAD}\nresult = run_workers([], len, 2, make_thread=_StepThread)`,
            expected: py.list(),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q38-19",
    version: 2,
    slug: "picklable-preflight",
    title: "Check jobs before sending them to processes",
    format: "validation",
    difficulty: "medium",
    minutes: 12,
    requires: ["assignment", "boolean", "comp-if", "enumerate-call", "for-loop", "function-def", "function-param", "function-return", "import-module", "list-comp", "list-literal", "list-mutate", "logical", "membership", "string-index", "top-level-indent", "try-except"],
    prompt: "A batch system sends jobs to a process pool, and a job that can't be pickled fails only after the pool has started. Write a pre-flight check `unsendable(jobs)` that tries to pickle each job and returns the positions of the ones that can't be sent.",
    spec: [
      ["Function", "`unsendable(jobs)`"],
      ["Returns", "a list of the indexes of jobs for which `pickle.dumps` raises, in order"],
      ["Rule", "catch the errors pickling raises for such objects (`pickle.PicklingError`, `TypeError`, `AttributeError`); don't stop at the first failure"],
    ],
    hiddenKinds: ["a lambda", "a nested function", "an open file", "plain data only"],
    hints: [
      "Try to pickle each job inside a `try`: the dumps function raises for jobs that can't be sent.",
      "Different unpicklable objects raise different exceptions; catch the three named in the spec.",
      "Record the index in the `except` and keep going.",
    ],
    explanation: "Top-level functions and plain data pickle; lambdas and nested functions have no importable name (`PicklingError`, or `AttributeError` in older versions), and objects tied to the operating system, such as open files or locks, raise `TypeError`. Checking every job and reporting all failures lets the caller fix them before paying to start processes.",
    code: {
      starter: src`
import pickle

def unsendable(jobs):
    return []
`,
      answer: src`
import pickle

def unsendable(jobs):
    bad = []
    for index, job in enumerate(jobs):
        try:
            pickle.dumps(job)
        except (pickle.PicklingError, TypeError, AttributeError):
            bad.append(index)
    return bad
`,
      alternatives: [
        src`
import pickle

def can_send(job):
    try:
        pickle.dumps(job)
    except (pickle.PicklingError, TypeError, AttributeError):
        return False
    return True

def unsendable(jobs):
    return [i for i, job in enumerate(jobs) if not can_send(job)]
`,
      ],
      wrong: [
        {
          code: src`
import pickle

def unsendable(jobs):
    bad = []
    for index, job in enumerate(jobs):
        try:
            pickle.dumps(job)
        except pickle.PicklingError:
            bad.append(index)
    return bad
`,
          fails: ["kinds"],
          why: "only PicklingError is caught, so a lock or open file crashes the check",
        },
        {
          code: src`
def unsendable(jobs):
    return [i for i, job in enumerate(jobs) if callable(job)]
`,
          fails: ["functions", "kinds"],
          why: "being callable isn't the problem: top-level functions pickle fine",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "functions",
            label: "lambdas and nested functions are reported; top-level functions and data are not",
            show: "unsendable([len, data, lambda x: x, nested])",
            expr: "def _outer():\n    def inner(x):\n        return x\n    return inner\nresult = unsendable([len, {'zone': '132', 'fares': [40.8]}, lambda x: x, _outer(), (1, 'a')])",
            expected: py.list(py.int(2), py.int(3)),
          },
          {
            kind: "expr",
            id: "kinds",
            label: "objects tied to the system (a lock, an open file) are reported",
            hidden: true,
            expr: "import threading as _th\nwith open('j.txt', 'w', encoding='utf-8') as _f:\n    result = unsendable([_th.Lock(), 'ok', _f])",
            expected: py.list(py.int(0), py.int(2)),
          },
          {
            kind: "expr",
            id: "plain",
            label: "plain data only",
            hidden: true,
            expr: "result = unsendable([1, 2.5, 'x', [1, 2], {'a': None}])",
            expected: py.list(),
          },
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q38-20",
    version: 2,
    slug: "scaling-report",
    title: "A scaling report from benchmark runs",
    format: "function_implementation",
    difficulty: "hard",
    minutes: 20,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "defaultdict-call", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "precedence", "string-index", "top-level-indent"],
    prompt: "A team benchmarked a CPU-heavy parser on CPython with different numbers of worker processes, several runs each. Write `scaling_report(runs)`: for every worker count, the best time, the speed-up against the best 1-worker time, and the efficiency (speed-up ÷ workers), sorted by worker count.",
    spec: [
      ["Function", "`scaling_report(runs)`"],
      ["runs", "a list of `{\"workers\": int, \"seconds\": float}`; there is at least one run with 1 worker"],
      ["Returns", "a list of `(workers, best_seconds, speedup, efficiency)` tuples sorted by workers"],
    ],
    hiddenKinds: ["runs in any order", "several runs per worker count", "a worker count measured once"],
    hints: [
      "First reduce the runs to the best (smallest) time per worker count.",
      "The baseline is the best time with 1 worker.",
      "For each worker count in increasing order, build the tuple from best time, baseline ÷ best, and that ÷ workers.",
    ],
    explanation: "Grouping keeps the minimum per worker count (the least disturbed run). Speed-up is relative to the best single-worker time, and efficiency shows how much of each extra core was used; it usually falls as workers grow because start-up, pickling and the serial parts don't shrink.",
    code: {
      starter: src`
def scaling_report(runs):
    return []
`,
      answer: src`
def scaling_report(runs):
    best = {}
    for run in runs:
        workers = run["workers"]
        if workers not in best or run["seconds"] < best[workers]:
            best[workers] = run["seconds"]
    baseline = best[1]
    report = []
    for workers in sorted(best):
        speedup = baseline / best[workers]
        report.append((workers, best[workers], speedup, speedup / workers))
    return report
`,
      alternatives: [
        src`
from collections import defaultdict

def scaling_report(runs):
    times = defaultdict(list)
    for r in runs:
        times[r["workers"]].append(r["seconds"])
    base = min(times[1])
    rows = []
    for w in sorted(times):
        t = min(times[w])
        rows.append((w, t, base / t, base / t / w))
    return rows
`,
      ],
      wrong: [
        {
          code: src`
def scaling_report(runs):
    totals = {}
    counts = {}
    for run in runs:
        totals[run["workers"]] = totals.get(run["workers"], 0) + run["seconds"]
        counts[run["workers"]] = counts.get(run["workers"], 0) + 1
    baseline = totals[1] / counts[1]
    report = []
    for workers in sorted(totals):
        avg = totals[workers] / counts[workers]
        report.append((workers, avg, baseline / avg, baseline / avg / workers))
    return report
`,
          fails: ["returns"],
          why: "averages include disturbed runs; the report should use each count's best time",
        },
        {
          code: src`
def scaling_report(runs):
    best = {}
    for run in runs:
        if run["workers"] not in best or run["seconds"] < best[run["workers"]]:
            best[run["workers"]] = run["seconds"]
    report = []
    for workers in sorted(best):
        speedup = best[1] / best[workers]
        report.append((workers, best[workers], speedup, speedup * workers))
    return report
`,
          fails: ["returns"],
          why: "efficiency is speed-up divided by workers, not multiplied",
        },
      ],
      task: {
        checks: [
          fn("returns", "scaling_report", [
            example([[{ workers: 1, seconds: 4.0 }, { workers: 2, seconds: 2.5 }, { workers: 4, seconds: 1.6 }]], [
              py.tuple(py.int(1), py.float(4), py.float(1), py.float(1)),
              py.tuple(py.int(2), py.float(2.5), py.float(1.6), py.float(0.8)),
              py.tuple(py.int(4), py.float(1.6), py.float(2.5), py.float(0.625)),
            ]),
            example([[{ workers: 1, seconds: 2.0 }]], [py.tuple(py.int(1), py.float(2), py.float(1), py.float(1))]),
            example([[{ workers: 1, seconds: 3.0 }, { workers: 1, seconds: 2.0 }, { workers: 2, seconds: 1.0 }]], [
              py.tuple(py.int(1), py.float(2), py.float(1), py.float(1)),
              py.tuple(py.int(2), py.float(1), py.float(2), py.float(1)),
            ]),
            hiddenCase("runs in any order", [[{ workers: 8, seconds: 1.0 }, { workers: 1, seconds: 6.0 }, { workers: 8, seconds: 0.75 }]], [
              py.tuple(py.int(1), py.float(6), py.float(1), py.float(1)),
              py.tuple(py.int(8), py.float(0.75), py.float(8), py.float(1)),
            ]),
            hiddenCase("several runs per worker count", [[{ workers: 2, seconds: 3.0 }, { workers: 1, seconds: 4.0 }, { workers: 2, seconds: 2.0 }, { workers: 1, seconds: 5.0 }]], [
              py.tuple(py.int(1), py.float(4), py.float(1), py.float(1)),
              py.tuple(py.int(2), py.float(2), py.float(2), py.float(1)),
            ]),
            hiddenCase("a slower parallel run", [[{ workers: 1, seconds: 1.0 }, { workers: 4, seconds: 2.0 }]], [
              py.tuple(py.int(1), py.float(1), py.float(1), py.float(1)),
              py.tuple(py.int(4), py.float(2), py.float(0.5), py.float(0.125)),
            ]),
          ], { label: "scaling_report() summarises each worker count", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
  },
  {
    id: "PY-Q38-22",
    version: 2,
    slug: "retry-failed-submissions",
    title: "Retry failed jobs through an executor",
    format: "integration",
    difficulty: "hard",
    minutes: 20,
    requires: ["arithmetic", "assignment", "break-statement", "comparison", "dict-comp", "dict-iterate", "dict-literal", "else-clause", "except-type", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "nested-loop", "none-value", "range-call", "reassignment", "string-index", "top-level-indent", "try-except", "while-loop"],
    prompt: "A geocoding service fails now and then. Write `run_with_retries(executor, func, items, attempts)`: submit every item, collect results, then resubmit only the items that failed, up to `attempts` rounds in total. Return `(results, failed)`: results for every item that eventually worked, and the sorted items that failed in every round.",
    spec: [
      ["Function", "`run_with_retries(executor, func, items, attempts)`"],
      ["Rounds", "round 1 submits every item; each later round submits only the items whose latest attempt raised; at most `attempts` rounds"],
      ["Returns", "`(results, failed)`: a dictionary item → result, and a sorted list of items that never succeeded"],
      ["Rule", "within a round, submit every item before reading any result"],
    ],
    hiddenKinds: ["an item that succeeds on the last round", "an item that never succeeds", "one attempt only", "no items"],
    hints: [
      "Keep a list of items still to do; it starts as all items.",
      "Each round: submit all of them, then read each future; successes go into the results, failures into the next round's list.",
      "Stop after `attempts` rounds or when nothing is left; what is left has failed.",
    ],
    explanation: "Each round submits the pending items together (so on a real pool they run concurrently), then sorts the futures into results and failures by asking `exception()` (or catching from `result()`). Only failures are retried, so successful work is never repeated, and a bounded number of rounds means a permanently broken item can't loop forever.",
    code: {
      starter: src`
def run_with_retries(executor, func, items, attempts):
    return {}, []
`,
      answer: src`
def run_with_retries(executor, func, items, attempts):
    results = {}
    pending = list(items)
    for _ in range(attempts):
        if not pending:
            break
        futures = [(item, executor.submit(func, item)) for item in pending]
        pending = []
        for item, future in futures:
            if future.exception() is None:
                results[item] = future.result()
            else:
                pending.append(item)
    return results, sorted(pending)
`,
      alternatives: [
        src`
def run_with_retries(executor, func, items, attempts):
    done = {}
    todo = list(items)
    round_no = 0
    while todo and round_no < attempts:
        round_no += 1
        submitted = {item: executor.submit(func, item) for item in todo}
        todo = []
        for item, fut in submitted.items():
            try:
                done[item] = fut.result()
            except Exception:
                todo.append(item)
    return done, sorted(todo)
`,
      ],
      wrong: [
        {
          code: src`
def run_with_retries(executor, func, items, attempts):
    results = {}
    failed = []
    for item in items:
        for _ in range(attempts):
            future = executor.submit(func, item)
            if future.exception() is None:
                results[item] = future.result()
                break
        else:
            failed.append(item)
    return results, sorted(failed)
`,
          fails: ["rounds"],
          why: "it retries each item to the end before submitting the next, so nothing runs together",
        },
        {
          code: src`
def run_with_retries(executor, func, items, attempts):
    results = {}
    pending = list(items)
    for _ in range(attempts):
        futures = [(item, executor.submit(func, item)) for item in items]
        pending = []
        for item, future in futures:
            if future.exception() is None:
                results[item] = future.result()
            else:
                pending.append(item)
    return results, sorted(pending)
`,
          fails: ["calls"],
          why: "every round resubmits all items, repeating work that already succeeded",
        },
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "results",
            label: "items that eventually work are returned; the rest are reported",
            show: "'Houston' fails once, 'Atlantis' always fails, attempts=3",
            expr: `${INLINE_EXECUTOR}\n_tries = {}\ndef _geo(city):\n    _tries[city] = _tries.get(city, 0) + 1\n    if city == 'Atlantis' or (city == 'Houston' and _tries[city] < 2):\n        raise TimeoutError(city)\n    return len(city)\nresult = run_with_retries(_Inline(), _geo, ['Houston', 'Denver', 'Atlantis'], 3)`,
            expected: py.tuple(py.dict([[py.str("Denver"), py.int(6)], [py.str("Houston"), py.int(7)]]), strs("Atlantis")),
          },
          {
            kind: "expr",
            id: "rounds",
            label: "each round submits all pending items before reading results",
            hidden: true,
            expr: `${INLINE_EXECUTOR}\n_events = []\nclass _Rec(_Inline):\n    def submit(self, fn, *a, **k):\n        _events.append('submit ' + a[0])\n        return _Inline.submit(self, fn, *a, **k)\n_t = {}\ndef _f(x):\n    _t[x] = _t.get(x, 0) + 1\n    if _t[x] < 2:\n        raise ValueError(x)\n    return x\nrun_with_retries(_Rec(), _f, ['a', 'b'], 2)\nresult = _events`,
            expected: strs("submit a", "submit b", "submit a", "submit b"),
          },
          {
            kind: "expr",
            id: "calls",
            label: "successful items are never resubmitted",
            hidden: true,
            expr: `${INLINE_EXECUTOR}\n_calls = []\ndef _f(x):\n    _calls.append(x)\n    if x == 'bad':\n        raise ValueError(x)\n    return 1\nrun_with_retries(_Inline(), _f, ['ok', 'bad'], 3)\nresult = sorted(_calls)`,
            expected: strs("bad", "bad", "bad", "ok"),
          },
          {
            kind: "expr",
            id: "edges",
            label: "one attempt only, and no items",
            hidden: true,
            expr: `${INLINE_EXECUTOR}\ndef _f(x):\n    raise ValueError(x)\nresult = [run_with_retries(_Inline(), _f, ['z', 'y'], 1), run_with_retries(_Inline(), _f, [], 5)]`,
            expected: py.list(py.tuple(py.dict([]), strs("y", "z")), py.tuple(py.dict([]), py.list())),
          },
        ],
      },
    },
  },
];
