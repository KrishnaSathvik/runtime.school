/**
 * M38 Threading & Multiprocessing: five lessons (PY-L38-01 … PY-L38-05).
 *
 * Honest framing. Python in a browser page runs on one thread with no child processes: threading.Thread.start()
 * raises RuntimeError, ProcessPoolExecutor raises NotImplementedError, and multiprocessing can't load. The lessons show
 * those real errors, and teach the parts that do run here for real:
 * - the threading API as objects (Thread, current_thread, Lock, Queue) and the start-all-then-join-all pattern, written
 *   against an injected thread class so the same function runs with real threads on a computer and with a stand-in
 *   (that runs each target when it is joined) here, where checks can see the order of starts and joins;
 * - concurrent.futures' real Future and Executor interfaces, through a small Executor subclass that runs each call
 *   immediately (labelled as such: no concurrency, same API and error behaviour as ThreadPoolExecutor);
 * - lost updates as a deterministic model (generators that pause where a thread switch can happen) and real
 *   threading.Lock objects; checks prove all shared access happens while a lock is held;
 * - what crosses a process boundary: real pickling (functions by name, lambdas refused) and chunked map/reduce;
 * - a benchmark of serial / threads / processes measured on real CPython 3.14.3 (Apple M3 Pro, 12 cores) by the
 *   course authors with concurrent.futures, given as data to analyse, never as output of code that ran here.
 * Every reference answer using the injected classes was also run with real threads/processes on CPython.
 * Version 2: rewritten from a module that printed fixed text in place of threads.
 */
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, keepsInput } from "../checks";
import { py } from "@/engine/python/values";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const yes = py.bool(true);

/**
 * A stand-in for threading.Thread used by checks: start() is logged, the target runs when join() is called, and an
 * exception escaping the target is caught and logged (a real thread's exception never reaches join() either).
 */
export const STEP_THREAD = [
  "_log = []",
  "class _StepThread:",
  "    def __init__(self, target=None, args=(), kwargs=None, name=None, daemon=None):",
  "        self._target = target",
  "        self._args = tuple(args)",
  "        self._kwargs = dict(kwargs or {})",
  "        self._done = False",
  "    def start(self):",
  "        _log.append('start')",
  "    def join(self, timeout=None):",
  "        if not self._done:",
  "            self._done = True",
  "            try:",
  "                self._target(*self._args, **self._kwargs)",
  "            except Exception as _e:",
  "                _log.append('unhandled ' + type(_e).__name__)",
  "        _log.append('join')",
].join("\n");

/** The executor checks pass in: a real concurrent.futures.Executor that runs each call when it is submitted. */
export const INLINE_EXECUTOR = [
  "from concurrent.futures import Executor as _Executor, Future as _Future",
  "class _Inline(_Executor):",
  "    submitted = 0",
  "    def submit(self, fn, *args, **kwargs):",
  "        _Inline.submitted += 1",
  "        _f = _Future()",
  "        try:",
  "            _f.set_result(fn(*args, **kwargs))",
  "        except Exception as _e:",
  "            _f.set_exception(_e)",
  "        return _f",
].join("\n");

/**
 * Mirrors for "first mirror that works": a down mirror's future has already failed when submit returns; an up
 * mirror's future finishes later, as soon as anything waits on it or reads it. as_completed() snapshots the finished
 * futures before it waits, so it yields every failure before the success, whatever the set order.
 */
export const MIRROR_EXECUTOR = [
  "from concurrent.futures import Executor as _Executor, Future as _Future",
  "class _Waiters(list):",
  "    def __init__(self, future):",
  "        super().__init__()",
  "        self.future = future",
  "    def append(self, waiter):",
  "        super().append(waiter)",
  "        self.future.answer()",
  "class _Answer(_Future):",
  "    def __init__(self, value):",
  "        super().__init__()",
  "        self._value = value",
  "        self._waiters = _Waiters(self)",
  "    def answer(self):",
  "        if self._state == 'PENDING':",
  "            self.set_result(self._value)",
  "    def done(self):",
  "        self.answer()",
  "        return super().done()",
  "    def result(self, timeout=None):",
  "        self.answer()",
  "        return super().result(timeout)",
  "    def exception(self, timeout=None):",
  "        self.answer()",
  "        return super().exception(timeout)",
  "class _Mirrors(_Executor):",
  "    def submit(self, fn, *args, **kwargs):",
  "        try:",
  "            _value = fn(*args, **kwargs)",
  "        except Exception as _e:",
  "            _f = _Future()",
  "            _f.set_exception(_e)",
  "            return _f",
  "        return _Answer(_value)",
].join("\n");

/** A dict that refuses to be read or written unless the given recording lock is held, and a lock that records use. */
export const GUARDED = [
  "class _RecLock:",
  "    def __init__(self):",
  "        self.held = False",
  "        self.uses = 0",
  "    def acquire(self, blocking=True, timeout=-1):",
  "        self.held = True",
  "        self.uses += 1",
  "        return True",
  "    def release(self):",
  "        self.held = False",
  "    def __enter__(self):",
  "        self.acquire()",
  "        return self",
  "    def __exit__(self, *exc):",
  "        self.release()",
  "        return False",
  "class _Guarded(dict):",
  "    lock = None",
  "    unguarded = 0",
  "    def __getitem__(self, k):",
  "        if not _Guarded.lock.held:",
  "            _Guarded.unguarded += 1",
  "        return dict.__getitem__(self, k)",
  "    def __setitem__(self, k, v):",
  "        if not _Guarded.lock.held:",
  "            _Guarded.unguarded += 1",
  "        dict.__setitem__(self, k, v)",
  "    def get(self, k, d=None):",
  "        if not _Guarded.lock.held:",
  "            _Guarded.unguarded += 1",
  "        return dict.get(self, k, d)",
].join("\n");

/**
 * Run `body` with the learner's program installed as the `__main__` module, as it is when a script runs on a computer,
 * so pickle can find top-level functions by name (the runner executes main.py in a plain namespace).
 */
const asMainModule = (body: string[]) =>
  [
    "import sys as _sys, types as _types",
    "_main = _types.ModuleType('__main__')",
    "_main.__dict__.update(globals())",
    "_saved_main = _sys.modules.get('__main__')",
    "_sys.modules['__main__'] = _main",
    "try:",
    ...body.map((l) => "    " + l),
    "finally:",
    "    _sys.modules['__main__'] = _saved_main",
  ].join("\n");

/** Benchmark measured on CPython 3.14.3, Apple M3 Pro (12 cores), best of 3 runs, 8 workers, in seconds. */
const measured = {
  io: { serial: 2.134, threads: 0.271, processes: 0.363 },
  cpu: { serial: 0.614, threads: 0.583, processes: 0.179 },
  tiny: { serial: 0.112, threads: 0.118, processes: 0.196 },
};

export const m38Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L38-01 threads
  {
    id: "PY-L38-01",
    version: 2,
    slug: "threads-start-and-join",
    title: "Threads: start, join, and why they help with waiting",
    lede: "A thread runs a function alongside the rest of the program. While one thread waits for a server, others can work, so forty slow requests take about as long as the slowest one. The pattern is always: start them all, then join them all.",
    focus: "Run work in threads with start and join, and collect results and errors safely.",
    minutes: 24,
    objectives: [
      "Create threads with `threading.Thread(target=..., args=...)` and explain start() and join()",
      "Write the start-all-then-join-all pattern, and collect results from inside the threads",
      "Explain when threads speed a program up (waiting) and when they don't (pure computation)",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "class-def", "comp-if", "comparison", "dict-comp", "dict-iterate", "dict-literal", "exc-name", "except-type", "for-loop", "function-def", "function-default", "function-doc", "function-param", "function-return", "import-module", "init-method", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "membership", "method-def", "none-value", "part-attr", "plain-class", "print-call", "print-several", "print-text", "range-call", "reassignment", "self-name", "star-args", "string-index", "top-level-indent", "try-except", "tuple-literal", "type-call", "unquoted-name", "zip-call"],
    teaches: ["thread-start"],
    blocks: [
      {
        kind: "text",
        md: "A **thread** is a separate line of execution inside the same program, sharing its memory. `threading.Thread(target=func, args=(...,))` describes one; `start()` begins running `func` in it while your code carries on; `join()` waits until it has finished. Threads pay off when the work mostly **waits**: for a network reply, a disk, a database. A waiting thread releases the GIL (“The interpreter: bytecode and the GIL”), so the waits overlap.\n\nPython in this browser page runs on a single thread, so creating `Thread` objects works but `start()` raises an error. The examples show both, and the exercises use the same functions with a stand-in thread class.",
      },
      {
        kind: "example",
        title: "A thread is an object first",
        code: src`
import threading

def send_receipt(order_id):
    print("receipt for", order_id)

worker = threading.Thread(target=send_receipt, args=("O100282",), name="receipts-1")
print(worker.name, worker.is_alive())
print(threading.current_thread().name, threading.active_count())
`,
        output: "receipts-1 False\nMainThread 1\n",
        note: "The thread exists but hasn't started, so it isn't alive. Every program begins in the main thread. Note `args=(\"O100282\",)`: a one-item tuple needs the comma.",
      },
      {
        kind: "error-example",
        title: "Starting a thread in this page",
        code: src`
import threading

def send_receipt(order_id):
    return "sent " + order_id

threading.Thread(target=send_receipt, args=("O100282",)).start()
`,
        error: "RuntimeError",
        output: "",
        note: "`RuntimeError: can't start new thread`: the browser build of Python has no threads. On a computer this line starts the thread and returns immediately.",
      },
      {
        kind: "text",
        md: "The pattern for running many jobs is **start every thread first, then join every thread**. Joining inside the start loop waits for each job before starting the next, which is just a slow serial loop. To make the function testable (and runnable here), take the thread class as a parameter with `threading.Thread` as the default: the dependency-injection idea from the Advanced OOP & Design module. The example passes `StepThread`, a stand-in that notes each `start()` and runs the work when `join()` is called.",
      },
      {
        kind: "example",
        title: "Start them all, then join them all",
        code: src`
import threading

def send_all(customers, send, make_thread=threading.Thread):
    threads = []
    for customer in customers:
        threads.append(make_thread(target=send, args=(customer,)))
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

class StepThread:
    """Stands in for threading.Thread here: start() is noted, the work runs at join()."""
    log = []

    def __init__(self, target, args=()):
        self.target = target
        self.args = args

    def start(self):
        StepThread.log.append("start " + self.args[0])

    def join(self):
        self.target(*self.args)
        StepThread.log.append("join " + self.args[0])

sent = []
send_all(["C00077", "C01338"], sent.append, make_thread=StepThread)
print(sent)
print(StepThread.log)
`,
        output: "['C00077', 'C01338']\n['start C00077', 'start C01338', 'join C00077', 'join C01338']\n",
        note: "Every thread is started before the first `join`, so on a computer all the sends run at the same time. Measured on CPython 3.14 (Apple M3 Pro), 40 jobs that each wait 0.05 s took 2.13 s one after another and 0.27 s with 8 threads.",
      },
      {
        kind: "text",
        md: "Two more rules. A thread's **return value is thrown away**, so a thread stores its result somewhere the main thread can read after `join()`, such as a dictionary (`results[url] = ...`; storing one key is safe under CPython's locks). And an **exception in a thread doesn't reach `join()`**: it is printed and lost. Catch errors inside the thread's function and record them.\n\n**When to use threads:** many independent waits (HTTP requests, file downloads, database calls). **When not to:** pure-Python computation (the GIL lets one thread compute at a time, “The interpreter: bytecode and the GIL”; use processes, “Processes: parallel work, separate memory”). **Mistakes to avoid:** joining inside the start loop; returning a value from the target; letting errors vanish; and unbounded numbers of threads (use a pool, next lesson).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Stop waiting for each thread before starting the next",
      prompt: "`warm_caches` starts a thread for each URL, but it joins every thread right after starting it, so the loads happen one after another. Split it into two loops, start all and then join all, and run it: the log should show both starts before the first join.",
      spec: [
        ["Function", "`warm_caches(urls, load, make_thread=threading.Thread)`"],
        ["Rule", "every thread is started before any thread is joined; every thread is joined"],
      ],
      starter: src`
import threading

def warm_caches(urls, load, make_thread=threading.Thread):
    for url in urls:
        thread = make_thread(target=load, args=(url,))
        thread.start()
        thread.join()

class StepThread:
    log = []

    def __init__(self, target, args=()):
        self.target = target
        self.args = args

    def start(self):
        StepThread.log.append("start")

    def join(self):
        self.target(*self.args)
        StepThread.log.append("join")

loaded = []
warm_caches(["/products", "/orders"], loaded.append, make_thread=StepThread)
print(loaded, StepThread.log)
`,
      answer: src`
import threading

def warm_caches(urls, load, make_thread=threading.Thread):
    threads = []
    for url in urls:
        thread = make_thread(target=load, args=(url,))
        thread.start()
        threads.append(thread)
    for thread in threads:
        thread.join()

class StepThread:
    log = []

    def __init__(self, target, args=()):
        self.target = target
        self.args = args

    def start(self):
        StepThread.log.append("start")

    def join(self):
        self.target(*self.args)
        StepThread.log.append("join")

loaded = []
warm_caches(["/products", "/orders"], loaded.append, make_thread=StepThread)
print(loaded, StepThread.log)
`,
      wrong: [
        {
          code: src`
import threading

def warm_caches(urls, load, make_thread=threading.Thread):
    for url in urls:
        make_thread(target=load, args=(url,)).start()
`,
          fails: ["order"],
          why: "nothing is joined, so the function returns before the work is done",
        },
      ],
      hints: [
        "Keep each thread in a list as you start it.",
        "After the first loop has started every thread, a second loop joins them.",
        "Move the `join()` call out of the first loop.",
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "order",
            label: "every thread is started before any is joined, and all are joined",
            show: "warm_caches(['/a', '/b', '/c'], load, make_thread=StepThread)",
            expr: `${STEP_THREAD}\n_loaded = []\nwarm_caches(['/a', '/b', '/c'], _loaded.append, make_thread=_StepThread)\nresult = [_log, _loaded]`,
            expected: py.list(py.list(py.str("start"), py.str("start"), py.str("start"), py.str("join"), py.str("join"), py.str("join")), py.list(py.str("/a"), py.str("/b"), py.str("/c"))),
          },
          {
            kind: "expr",
            id: "none",
            label: "no URLs, no threads",
            hidden: true,
            expr: `${STEP_THREAD}\nwarm_caches([], print, make_thread=_StepThread)\nresult = _log`,
            expected: py.list(),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Fetch every price in parallel",
        prompt: "A price page asks a slow pricing service about many products. Write `fetch_all(skus, fetch, make_thread=threading.Thread)` that fetches every SKU in its own thread and returns a dictionary from SKU to the fetched price. Threads can't return values, so each one must store its result where the caller can read it after joining.",
        spec: [
          ["Function", "`fetch_all(skus, fetch, make_thread=threading.Thread)`"],
          ["fetch", "a function taking one SKU and returning its price"],
          ["Returns", "`{sku: price}` for every SKU; each SKU is fetched once"],
          ["Rule", "start every thread before joining any"],
        ],
        starter: src`
import threading

def fetch_all(skus, fetch, make_thread=threading.Thread):
    return {}

class StepThread:
    def __init__(self, target, args=()):
        self.target = target
        self.args = args

    def start(self):
        pass

    def join(self):
        self.target(*self.args)

prices = {"SPO-11681": 7.49, "HOM-22847": 31.0}
print(fetch_all(list(prices), prices.get, make_thread=StepThread))
`,
        answer: src`
import threading

def fetch_all(skus, fetch, make_thread=threading.Thread):
    results = {}

    def work(sku):
        results[sku] = fetch(sku)

    threads = []
    for sku in skus:
        thread = make_thread(target=work, args=(sku,))
        thread.start()
        threads.append(thread)
    for thread in threads:
        thread.join()
    return results

class StepThread:
    def __init__(self, target, args=()):
        self.target = target
        self.args = args

    def start(self):
        pass

    def join(self):
        self.target(*self.args)

prices = {"SPO-11681": 7.49, "HOM-22847": 31.0}
print(fetch_all(list(prices), prices.get, make_thread=StepThread))
`,
        alternatives: [
          src`
import threading

def fetch_all(skus, fetch, make_thread=threading.Thread):
    slots = [None] * len(skus)

    def work(position):
        slots[position] = fetch(skus[position])

    threads = [make_thread(target=work, args=(i,)) for i in range(len(skus))]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    return dict(zip(skus, slots))
`,
        ],
        wrong: [
          {
            code: src`
import threading

def fetch_all(skus, fetch, make_thread=threading.Thread):
    results = {}
    for sku in skus:
        thread = make_thread(target=fetch, args=(sku,))
        thread.start()
        thread.join()
        results[sku] = fetch(sku)
    return results
`,
            fails: ["order", "once"],
            why: "it joins inside the loop (serial) and then fetches every SKU a second time in the main thread",
          },
          {
            code: src`
import threading

def fetch_all(skus, fetch, make_thread=threading.Thread):
    results = {}

    def work(sku):
        results[sku] = fetch(sku)

    for sku in skus:
        make_thread(target=work, args=(sku,)).start()
    return results
`,
            fails: ["results", "order", "once"],
            why: "nothing is joined, so the results are read before the threads have finished",
          },
        ],
        hints: [
          "Write a small inner function that fetches one SKU and stores the price in a dictionary from the enclosing function.",
          "Make each thread run that inner function; start them all, keeping them in a list.",
          "Join every thread, and only then return the dictionary.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "results",
              label: "fetch_all() returns every SKU's price",
              show: "fetch_all(['SPO-11681', 'HOM-22847'], prices.get, make_thread=StepThread)",
              expr: `${STEP_THREAD}\n_p = {'SPO-11681': 7.49, 'HOM-22847': 31.0}\nresult = fetch_all(['SPO-11681', 'HOM-22847'], _p.get, make_thread=_StepThread)`,
              expected: py.dict([[py.str("SPO-11681"), py.float(7.49)], [py.str("HOM-22847"), py.float(31)]]),
            },
            {
              kind: "expr",
              id: "order",
              label: "all threads start before any is joined",
              hidden: true,
              expr: `${STEP_THREAD}\nfetch_all(['a', 'b', 'c'], len, make_thread=_StepThread)\nresult = _log`,
              expected: py.list(py.str("start"), py.str("start"), py.str("start"), py.str("join"), py.str("join"), py.str("join")),
            },
            {
              kind: "expr",
              id: "once",
              label: "each SKU is fetched exactly once",
              hidden: true,
              expr: `${STEP_THREAD}\n_calls = []\ndef _fetch(s):\n    _calls.append(s)\n    return len(s)\nfetch_all(['x', 'yy'], _fetch, make_thread=_StepThread)\nresult = sorted(_calls)`,
              expected: py.list(py.str("x"), py.str("yy")),
            },
            {
              kind: "expr",
              id: "empty",
              label: "no SKUs gives an empty dictionary",
              hidden: true,
              expr: `${STEP_THREAD}\nresult = fetch_all([], len, make_thread=_StepThread)`,
              expected: py.dict([]),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Don't lose a thread's exception",
        prompt: "Some products are missing from the pricing service, and its client raises `KeyError` for them. An exception inside a thread never reaches `join()`, so it would simply vanish. Write `fetch_report(skus, fetch, make_thread=threading.Thread)` that returns `(prices, errors)`: prices for the SKUs that worked, and for each failed SKU the **name** of the exception it raised.",
        spec: [
          ["Function", "`fetch_report(skus, fetch, make_thread=threading.Thread)`"],
          ["Returns", "a tuple `(prices, errors)`: `{sku: price}` and `{sku: \"KeyError\"}` (the exception's class name)"],
          ["Rule", "every exception is caught inside the thread's function; start all threads before joining any"],
        ],
        starter: src`
import threading

def fetch_report(skus, fetch, make_thread=threading.Thread):
    return {}, {}

class StepThread:
    def __init__(self, target, args=()):
        self.target = target
        self.args = args

    def start(self):
        pass

    def join(self):
        self.target(*self.args)

prices = {"SPO-11681": 7.49}
print(fetch_report(["SPO-11681", "BOO-58412"], lambda sku: prices[sku], make_thread=StepThread))
`,
        answer: src`
import threading

def fetch_report(skus, fetch, make_thread=threading.Thread):
    prices = {}
    errors = {}

    def work(sku):
        try:
            prices[sku] = fetch(sku)
        except Exception as error:
            errors[sku] = type(error).__name__

    threads = [make_thread(target=work, args=(sku,)) for sku in skus]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return prices, errors

class StepThread:
    def __init__(self, target, args=()):
        self.target = target
        self.args = args

    def start(self):
        pass

    def join(self):
        self.target(*self.args)

prices = {"SPO-11681": 7.49}
print(fetch_report(["SPO-11681", "BOO-58412"], lambda sku: prices[sku], make_thread=StepThread))
`,
        alternatives: [
          src`
import threading

def fetch_report(skus, fetch, make_thread=threading.Thread):
    outcomes = {}

    def work(sku):
        try:
            outcomes[sku] = ("ok", fetch(sku))
        except Exception as e:
            outcomes[sku] = ("error", e.__class__.__name__)

    workers = []
    for sku in skus:
        w = make_thread(target=work, args=(sku,))
        w.start()
        workers.append(w)
    for w in workers:
        w.join()
    prices = {s: v for s, (kind, v) in outcomes.items() if kind == "ok"}
    errors = {s: v for s, (kind, v) in outcomes.items() if kind == "error"}
    return prices, errors
`,
        ],
        wrong: [
          {
            code: src`
import threading

def fetch_report(skus, fetch, make_thread=threading.Thread):
    prices = {}
    errors = {}

    def work(sku):
        prices[sku] = fetch(sku)

    threads = [make_thread(target=work, args=(sku,)) for sku in skus]
    for thread in threads:
        thread.start()
    for thread in threads:
        try:
            thread.join()
        except Exception as error:
            errors[thread] = type(error).__name__
    return prices, errors
`,
            fails: ["report", "unhandled", "kinds"],
            why: "an exception inside a thread never reaches join(), so this except never runs and the error is lost",
          },
          {
            code: src`
import threading

def fetch_report(skus, fetch, make_thread=threading.Thread):
    prices = {}
    errors = {}

    def work(sku):
        try:
            prices[sku] = fetch(sku)
        except Exception as error:
            errors[sku] = str(error)

    threads = [make_thread(target=work, args=(sku,)) for sku in skus]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()
    return prices, errors
`,
            fails: ["report", "kinds"],
            why: "it records the error's message, not its class name",
          },
        ],
        hints: [
          "The thread's own function is the only place that can see the exception.",
          "Wrap the fetch in `try`/`except Exception as error` inside that function, and record `type(error).__name__` for the SKU.",
          "Start all threads, join all, then return both dictionaries as a tuple.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "report",
              label: "fetch_report() separates prices from errors",
              show: "one known and one unknown SKU",
              expr: `${STEP_THREAD}\n_p = {'SPO-11681': 7.49}\nresult = fetch_report(['SPO-11681', 'BOO-58412'], lambda s: _p[s], make_thread=_StepThread)`,
              expected: py.tuple(py.dict([[py.str("SPO-11681"), py.float(7.49)]]), py.dict([[py.str("BOO-58412"), py.str("KeyError")]])),
            },
            {
              kind: "expr",
              id: "unhandled",
              label: "no exception escapes a thread",
              hidden: true,
              expr: `${STEP_THREAD}\ndef _f(s):\n    if s == 'bad':\n        raise ValueError('bad sku')\n    return 1.0\nfetch_report(['ok', 'bad', 'ok2'], _f, make_thread=_StepThread)\nresult = [x for x in _log if x.startswith('unhandled')]`,
              expected: py.list(),
            },
            {
              kind: "expr",
              id: "kinds",
              label: "different exception types are named",
              hidden: true,
              expr: `${STEP_THREAD}\ndef _f(s):\n    if s == 'z':\n        raise ZeroDivisionError()\n    if s == 't':\n        raise TimeoutError()\n    return 2.5\nresult = fetch_report(['z', 't', 'k'], _f, make_thread=_StepThread)`,
              expected: py.tuple(py.dict([[py.str("k"), py.float(2.5)]]), py.dict([[py.str("z"), py.str("ZeroDivisionError")], [py.str("t"), py.str("TimeoutError")]])),
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
import threading

jobs = [threading.Thread(target=print, args=(n,)) for n in range(3)]
print(len(jobs), jobs[0].is_alive(), threading.current_thread().name)
`,
        choices: ["3 False MainThread", "3 True MainThread", "0 False MainThread", "3 False Thread-1"],
        answer: 0,
        why: "Three Thread objects exist, but none has been started, so none is alive; the code runs in the main thread.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `for url in urls: t = Thread(target=download, args=(url,)); t.start(); t.join()`. How long do 20 downloads of 1 second each take on a computer?",
        choices: [
          "About 20 seconds: each join waits before the next thread starts",
          "About 1 second: threads run at the same time",
          "About 0 seconds: threads finish instantly",
          "It raises an error",
        ],
        answer: 0,
        why: "Joining right after starting makes the loop serial. Start all twenty first, then join them, and the waits overlap.",
      },
      {
        id: "q3",
        prompt: "On standard CPython, which job do threads speed up?",
        choices: [
          "Calling 30 slow web APIs",
          "Resizing images with a pure-Python loop",
          "Summing a billion numbers in Python",
          "Sorting a list",
        ],
        answer: 0,
        why: "Waiting for the network releases the GIL, so the waits overlap. Pure-Python computation holds the GIL, so threads take turns.",
      },
    ],
    review: [
      "`threading.Thread(target=f, args=(x,))`; `start()` runs it alongside, `join()` waits for it.",
      "Start all threads, then join all; results go into a shared dictionary, errors are caught inside the thread.",
      "Threads help waiting work, not pure-Python computation.",
      "Next: thread pools, which manage the threads and return results for you.",
    ],
  },

  // ------------------------------------------------------------------ PY-L38-02 executors
  {
    id: "PY-L38-02",
    version: 2,
    slug: "executors-and-futures",
    title: "Executors and futures",
    lede: "concurrent.futures hides the threads: an executor runs submitted calls on a pool of workers and hands back futures, objects that will hold each result or exception. One interface covers thread pools and process pools.",
    focus: "Submit work to an executor and handle results and errors through futures.",
    minutes: 22,
    objectives: [
      "Use `submit` and a Future's `result()`, `exception()` and `done()`",
      "Choose between `map` (results in input order) and `as_completed` (results as they finish)",
      "Write functions that accept any Executor, so they can be tested without threads",
    ],
    requires: ["arithmetic", "assignment", "class-def", "conditional-expr", "continue-statement", "dict-iterate", "dict-literal", "except-type", "for-loop", "function-def", "function-doc", "function-param", "function-return", "identity", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "map-call", "membership", "method-def", "none-value", "package-import", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "star-args", "star-kwargs", "string-index", "subclass", "top-level-indent", "try-except", "type-call", "with-statement"],
    teaches: ["pool-submit"],
    blocks: [
      {
        kind: "text",
        md: "Starting and joining threads by hand gets repetitive, and unlimited threads overload servers. `concurrent.futures.ThreadPoolExecutor(max_workers=8)` keeps a pool of 8 threads; `executor.submit(func, *args)` queues a call and immediately returns a **Future**. `future.result()` waits for the call and returns its value, or **re-raises** the exception it raised. Using the executor in a `with` block waits for all work and shuts the pool down.\n\nAll executors share the `Executor` interface. This page has no threads, so the example defines a tiny real `Executor` subclass that runs each call immediately, in this thread: no concurrency, but the same futures, results and exceptions. On a computer you would pass a `ThreadPoolExecutor` to the same functions.",
      },
      {
        kind: "example",
        title: "Futures hold results and exceptions",
        code: src`
from concurrent.futures import Executor, Future

class InlineExecutor(Executor):
    """Runs each call as soon as it is submitted, in this thread. Same interface as ThreadPoolExecutor."""

    def submit(self, fn, *args, **kwargs):
        future = Future()
        try:
            future.set_result(fn(*args, **kwargs))
        except Exception as error:
            future.set_exception(error)
        return future

def stock_level(sku):
    levels = {"SPO-11681": 4, "HOM-22847": 0}
    return levels[sku]

with InlineExecutor() as executor:
    ok = executor.submit(stock_level, "SPO-11681")
    missing = executor.submit(stock_level, "BOO-58412")
    print(ok.done(), ok.result())
    print(type(missing.exception()).__name__)
    try:
        missing.result()
    except KeyError as error:
        print("result() re-raised", repr(error))
    print(list(executor.map(stock_level, ["HOM-22847", "SPO-11681"])))
`,
        output: "True 4\nKeyError\nresult() re-raised KeyError('BOO-58412')\n[0, 4]\n",
        note: "The failed call didn't crash the program at `submit`; its exception waited inside the future until `result()` raised it. `map` (inherited from `Executor`) returns results in input order.",
      },
      {
        kind: "error-example",
        title: "A real thread pool in this page",
        code: src`
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=4) as pool:
    print(pool.submit(len, "SPO-11681").result())
`,
        error: "RuntimeError",
        output: "",
        note: "`RuntimeError: can't start new thread`: the pool starts its threads on the first `submit`. On a computer this prints 9.",
      },
      {
        kind: "text",
        md: "Two ways to collect many results. `executor.map(func, items)` yields results **in input order**, waiting for each in turn, and raises the first exception it meets. `concurrent.futures.as_completed(futures)` yields futures **as they finish**, which is what you want to show progress or react to the first answer. On a real pool the finishing order depends on timing; never rely on it. For many jobs, keep a dictionary from future to its input so you know which job each finished future belongs to.\n\n**When to use it:** almost always instead of raw threads: bounded workers, results and exceptions handled for you, and the same code works with `ProcessPoolExecutor` (“Processes: parallel work, separate memory”). **Mistakes to avoid:** never calling `result()` (exceptions are silently kept in the future); calling `result()` right after each `submit` (serial again); and assuming `as_completed` order.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Return results, not futures",
      prompt: "`stock_levels` submits a lookup per SKU but returns the futures themselves. Change it to return each future's result, in the same order as the SKUs, and run it.",
      spec: [
        ["Function", "`stock_levels(executor, lookup, skus)`"],
        ["Returns", "a list with `lookup(sku)` for each SKU, in order"],
      ],
      starter: src`
from concurrent.futures import Executor, Future

def stock_levels(executor, lookup, skus):
    futures = [executor.submit(lookup, sku) for sku in skus]
    return futures

class InlineExecutor(Executor):
    def submit(self, fn, *args, **kwargs):
        future = Future()
        try:
            future.set_result(fn(*args, **kwargs))
        except Exception as error:
            future.set_exception(error)
        return future

levels = {"SPO-11681": 4, "HOM-22847": 0}
print(stock_levels(InlineExecutor(), levels.get, ["SPO-11681", "HOM-22847"]))
`,
      answer: src`
from concurrent.futures import Executor, Future

def stock_levels(executor, lookup, skus):
    futures = [executor.submit(lookup, sku) for sku in skus]
    return [future.result() for future in futures]

class InlineExecutor(Executor):
    def submit(self, fn, *args, **kwargs):
        future = Future()
        try:
            future.set_result(fn(*args, **kwargs))
        except Exception as error:
            future.set_exception(error)
        return future

levels = {"SPO-11681": 4, "HOM-22847": 0}
print(stock_levels(InlineExecutor(), levels.get, ["SPO-11681", "HOM-22847"]))
`,
      wrong: [
        {
          code: src`
def stock_levels(executor, lookup, skus):
    return [lookup(sku) for sku in skus]
`,
          fails: ["submitted"],
          why: "the results are right, but the executor is never used, so nothing would run in parallel",
        },
      ],
      hints: [
        "A Future is a box for a result, not the result itself.",
        "Each future has a method that waits for and returns its value.",
        "Build the list from `future.result()` for each future, keeping their order.",
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "levels",
            label: "stock_levels() returns the looked-up values in order",
            show: "stock_levels(InlineExecutor(), levels.get, ['SPO-11681', 'HOM-22847'])",
            expr: `${INLINE_EXECUTOR}\n_lv = {'SPO-11681': 4, 'HOM-22847': 0}\nresult = stock_levels(_Inline(), _lv.get, ['SPO-11681', 'HOM-22847', 'X'])`,
            expected: py.list(py.int(4), py.int(0), py.none),
          },
          {
            kind: "expr",
            id: "submitted",
            label: "every lookup goes through the executor",
            hidden: true,
            expr: `${INLINE_EXECUTOR}\n_Inline.submitted = 0\nstock_levels(_Inline(), len, ['a', 'bb', 'ccc'])\nresult = _Inline.submitted`,
            expected: py.int(3),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Prices for every SKU, failures as None",
        prompt: "Write `price_all(executor, fetch, skus)` for a catalogue page: submit one `fetch(sku)` per SKU to the executor, then build a dictionary from SKU to price. A fetch that raises any exception gives `None` for that SKU instead of breaking the whole page. Your function must work with any `Executor` (the checker passes one that runs calls immediately; on a computer it would be a `ThreadPoolExecutor`).",
        spec: [
          ["Function", "`price_all(executor, fetch, skus)`"],
          ["Returns", "`{sku: price or None}` for every SKU"],
          ["Rule", "submit every fetch before reading any result"],
        ],
        starter: src`
def price_all(executor, fetch, skus):
    return {}
`,
        answer: src`
def price_all(executor, fetch, skus):
    futures = {}
    for sku in skus:
        futures[sku] = executor.submit(fetch, sku)
    prices = {}
    for sku, future in futures.items():
        try:
            prices[sku] = future.result()
        except Exception:
            prices[sku] = None
    return prices
`,
        alternatives: [
          src`
def price_all(executor, fetch, skus):
    pending = [(sku, executor.submit(fetch, sku)) for sku in skus]
    result = {}
    for sku, fut in pending:
        result[sku] = None if fut.exception() is not None else fut.result()
    return result
`,
        ],
        wrong: [
          {
            code: src`
def price_all(executor, fetch, skus):
    prices = {}
    for sku in skus:
        prices[sku] = executor.submit(fetch, sku).result()
    return prices
`,
            fails: ["errors"],
            why: "it waits for each result before submitting the next (serial), and the first failure crashes the page",
          },
          {
            code: src`
def price_all(executor, fetch, skus):
    prices = {}
    for sku, price in zip(skus, executor.map(fetch, skus)):
        prices[sku] = price
    return prices
`,
            fails: ["errors"],
            why: "`map` re-raises the first exception, so one missing product breaks the whole page",
          },
        ],
        hints: [
          "Submit everything first and keep each future next to its SKU (a dictionary works).",
          "Then ask each future for its result.",
          "`result()` re-raises the fetch's exception; catch it there and store `None`.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "prices",
              label: "price_all() returns every price",
              show: "price_all(InlineExecutor(), prices.__getitem__, ['SPO-11681', 'HOM-22847'])",
              expr: `${INLINE_EXECUTOR}\n_p = {'SPO-11681': 7.49, 'HOM-22847': 31.0}\nresult = price_all(_Inline(), _p.__getitem__, ['SPO-11681', 'HOM-22847'])`,
              expected: py.dict([[py.str("SPO-11681"), py.float(7.49)], [py.str("HOM-22847"), py.float(31)]]),
            },
            {
              kind: "expr",
              id: "errors",
              label: "a failing fetch gives None for that SKU only",
              hidden: true,
              expr: `${INLINE_EXECUTOR}\n_p = {'SPO-11681': 7.49}\nresult = price_all(_Inline(), _p.__getitem__, ['BOO-58412', 'SPO-11681'])`,
              expected: py.dict([[py.str("BOO-58412"), py.none], [py.str("SPO-11681"), py.float(7.49)]]),
            },
            {
              kind: "expr",
              id: "submitted",
              label: "every SKU is submitted to the executor",
              hidden: true,
              expr: `${INLINE_EXECUTOR}\n_Inline.submitted = 0\nprice_all(_Inline(), len, ['a', 'b', 'c', 'd'])\nresult = _Inline.submitted`,
              expected: py.int(4),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Download from the first mirror that works",
        prompt: "A data file is published on several mirrors; some are down. Write `first_success(executor, download, mirrors)`: submit a download from every mirror, then take results **as they complete** and return the first successful one. If every mirror fails, raise `RuntimeError(\"all mirrors failed\")`. (All mirrors serve the same file, so any success is the answer.)",
        spec: [
          ["Function", "`first_success(executor, download, mirrors)`"],
          ["Returns", "the result of the first download that completes without an exception"],
          ["Raises", "`RuntimeError(\"all mirrors failed\")` when every download raises (or there are no mirrors)"],
        ],
        starter: src`
from concurrent.futures import as_completed

def first_success(executor, download, mirrors):
    return None
`,
        answer: src`
from concurrent.futures import as_completed

def first_success(executor, download, mirrors):
    futures = [executor.submit(download, mirror) for mirror in mirrors]
    for future in as_completed(futures):
        if future.exception() is None:
            return future.result()
    raise RuntimeError("all mirrors failed")
`,
        alternatives: [
          src`
import concurrent.futures

def first_success(executor, download, mirrors):
    pending = [executor.submit(download, m) for m in mirrors]
    for done in concurrent.futures.as_completed(pending):
        try:
            return done.result()
        except Exception:
            continue
    raise RuntimeError("all mirrors failed")
`,
        ],
        wrong: [
          {
            code: src`
from concurrent.futures import as_completed

def first_success(executor, download, mirrors):
    futures = [executor.submit(download, mirror) for mirror in mirrors]
    for future in as_completed(futures):
        return future.result()
    raise RuntimeError("all mirrors failed")
`,
            fails: ["skips-failures", "all-fail"],
            why: "it returns whatever finishes first, even a failure, whose result() re-raises",
          },
          {
            code: src`
from concurrent.futures import as_completed

def first_success(executor, download, mirrors):
    futures = [executor.submit(download, mirror) for mirror in mirrors]
    for future in as_completed(futures):
        if future.exception() is None:
            return future.result()
    return None
`,
            fails: ["all-fail", "none"],
            why: "when every mirror fails it returns None instead of raising",
          },
        ],
        hints: [
          "Submit every download first; `as_completed` then hands you the futures as they finish.",
          "`future.exception()` is `None` for a call that succeeded.",
          "If the loop ends without a success, raise the RuntimeError.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "skips-failures",
              label: "failed mirrors are skipped",
              show: "two mirrors down, one up",
              expr: `${MIRROR_EXECUTOR}\ndef _dl(m):\n    if m != 'eu':\n        raise ConnectionError(m)\n    return 'quakes.geojson'\nresult = first_success(_Mirrors(), _dl, ['us', 'eu', 'asia'])`,
              expected: py.str("quakes.geojson"),
            },
            {
              kind: "expr",
              id: "all-up",
              label: "with every mirror up, the file is returned",
              show: "three mirrors up",
              expr: `${INLINE_EXECUTOR}\nresult = first_success(_Inline(), lambda m: 'data', ['a', 'b', 'c'])`,
              expected: py.str("data"),
            },
            {
              kind: "expr",
              id: "all-fail",
              label: "every mirror down raises RuntimeError",
              hidden: true,
              expr: `${INLINE_EXECUTOR}\ndef _dl(m):\n    raise TimeoutError(m)\ntry:\n    first_success(_Inline(), _dl, ['a', 'b'])\n    result = 'no error'\nexcept RuntimeError as _e:\n    result = str(_e)`,
              expected: py.str("all mirrors failed"),
            },
            {
              kind: "expr",
              id: "none",
              label: "no mirrors raises RuntimeError",
              hidden: true,
              expr: `${INLINE_EXECUTOR}\ntry:\n    first_success(_Inline(), len, [])\n    result = 'no error'\nexcept RuntimeError:\n    result = 'RuntimeError'`,
              expected: py.str("RuntimeError"),
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
from concurrent.futures import Future

future = Future()
print(future.done())
future.set_exception(ValueError("bad price"))
print(future.done(), type(future.exception()).__name__)
`,
        choices: ["False\nTrue ValueError", "False\nFalse ValueError", "True\nTrue ValueError", "False\nTrue None"],
        answer: 0,
        why: "A new future isn't done. Setting an exception completes it (done is True), and `exception()` returns the stored error instead of raising it.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `results = [pool.submit(fetch, u).result() for u in urls]`. What does this do on a ThreadPoolExecutor?",
        choices: [
          "Runs the fetches one at a time, because each result() waits before the next submit",
          "Runs every fetch at once",
          "Raises an error",
          "Returns futures instead of results",
        ],
        answer: 0,
        why: "`result()` blocks. Submit everything first, then collect the results.",
      },
      {
        id: "q3",
        prompt: "You want to update a progress bar each time one of 200 downloads finishes. Which tool fits?",
        choices: ["as_completed", "executor.map", "calling result() in submission order", "a single thread"],
        answer: 0,
        why: "`as_completed` yields each future as soon as it finishes; `map` waits in input order.",
      },
    ],
    review: [
      "`executor.submit(f, x)` returns a Future; `result()` waits and returns the value or re-raises the error.",
      "`map` keeps input order; `as_completed` yields futures as they finish.",
      "Accept an `Executor` parameter: thread pool in production, an inline executor in tests.",
      "Next: what goes wrong when threads share data, and locks.",
    ],
  },

  // ------------------------------------------------------------------ PY-L38-03 shared state
  {
    id: "PY-L38-03",
    version: 2,
    slug: "shared-state-and-locks",
    title: "Shared state: lost updates and locks",
    lede: "When two threads read and update the same value, a switch between the read and the write loses an update. The bug is rare, silent and timing-dependent; a lock makes the read-modify-write one step.",
    focus: "Explain lost updates and protect shared read-modify-write steps with a lock.",
    minutes: 24,
    objectives: [
      "Trace how two interleaved read-modify-write sequences lose an update",
      "Protect shared updates with `threading.Lock` and `with lock:`",
      "Prefer designs that share less: each thread its own result, or a Queue to hand work over",
    ],
    requires: ["arithmetic", "assignment", "attr-assign", "boolean", "class-def", "comparison", "continue-statement", "dict-get", "dict-literal", "dict-lookup", "else-clause", "finally-clause", "for-loop", "function-def", "function-default", "function-param", "function-return", "if-statement", "import-module", "init-method", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "nested-loop", "none-value", "plain-class", "print-call", "print-several", "print-text", "range-call", "reassignment", "self-name", "string-index", "top-level-indent", "truthiness", "try-except", "unquoted-name", "while-loop", "with-statement", "yield-expr"],
    teaches: ["thread-lock"],
    blocks: [
      {
        kind: "text",
        md: "`balance += 10` is a read, an addition and a write (“The interpreter: bytecode and the GIL”). If thread A reads 100, then the scheduler switches to thread B, which also reads 100 and writes 110, A later writes its own 110 and B's deposit is lost. Real threads switch at unpredictable moments, so this happens rarely and differently every run, which makes it a nasty bug.\n\nThe example makes the switching visible with a **model**: each \"thread\" is a generator that pauses (`yield`) at the point where a real thread could be switched out, and a schedule decides who runs next. The model is deterministic, so every interleaving can be tried on purpose.",
      },
      {
        kind: "example",
        title: "Two deposits, two schedules",
        code: src`
def deposit(account, amount):
    balance = account["balance"]
    yield "read"
    account["balance"] = balance + amount
    yield "wrote"

def run(schedule, workers):
    for name in schedule:
        next(workers[name], None)

account = {"balance": 100}
run(["A", "A", "B", "B"], {"A": deposit(account, 10), "B": deposit(account, 10)})
print(account["balance"])
account = {"balance": 100}
run(["A", "B", "A", "B"], {"A": deposit(account, 10), "B": deposit(account, 10)})
print(account["balance"])
`,
        output: "120\n110\n",
        note: "Each `next` lets one worker run up to its next pause. When A finishes before B starts, both deposits count. When B reads between A's read and A's write, both write 110: one deposit disappears without any error.",
      },
      {
        kind: "text",
        md: "A **lock** allows only one thread at a time into a section of code. `threading.Lock()` creates one; `with lock:` acquires it (waiting if another thread holds it) and releases it at the end of the block, even after an error. Put the **whole** read-modify-write inside the same `with lock:` block. Below, the model uses a real `threading.Lock`: a worker that can't acquire it (`acquire(blocking=False)` returns False) pauses and tries again, as a real thread would wait.",
      },
      {
        kind: "example",
        title: "The same deposits with a lock",
        code: src`
import threading

def safe_deposit(account, amount, lock):
    while not lock.acquire(blocking=False):
        yield "waiting"
    try:
        balance = account["balance"]
        yield "read"
        account["balance"] = balance + amount
        yield "wrote"
    finally:
        lock.release()

def run_until_done(workers):
    running = list(workers)
    while running:
        for worker in list(running):
            if next(worker, "done") == "done":
                running.remove(worker)

lock = threading.Lock()
account = {"balance": 100}
run_until_done([safe_deposit(account, 10, lock), safe_deposit(account, 10, lock)])
print(account["balance"], lock.locked())
`,
        output: "120 False\n",
        note: "The workers still take turns step by step, but B waits while A holds the lock, so B reads only after A has written. At the end nobody holds the lock. In real code you would simply write `with lock:` around the read and the write.",
      },
      {
        kind: "text",
        md: "Locks have costs: code inside them runs one thread at a time, and two locks taken in different orders can **deadlock** (each thread waits for the other forever). Often the better fix is to share less: give each thread its own result slot and combine after `join`, or pass work between threads through a `queue.Queue`, which does its own locking (`put` and `get` are safe from any thread).\n\n**Mistakes to avoid:** locking the write but not the read; using a different lock in different places for the same data; doing slow work (network calls) while holding a lock; and believing the GIL protects your read-modify-write (it doesn't, “The interpreter: bytecode and the GIL”).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Put the whole update under the lock",
      prompt: "`add_points` reads a customer's points outside the lock and writes them inside it, so two threads can still read the same old value. Move the read into the `with lock:` block too, and run it. The check uses a dictionary that complains about any access made without the lock.",
      spec: [
        ["Function", "`add_points(ledger, customer, points, lock)`"],
        ["Effect", "adds `points` to `ledger[customer]` (missing customers start at 0); every read and write of `ledger` happens while `lock` is held"],
      ],
      starter: src`
import threading

def add_points(ledger, customer, points, lock):
    current = ledger.get(customer, 0)
    with lock:
        ledger[customer] = current + points

ledger = {"C00077": 120}
lock = threading.Lock()
add_points(ledger, "C00077", 30, lock)
add_points(ledger, "C01338", 15, lock)
print(ledger)
`,
      answer: src`
import threading

def add_points(ledger, customer, points, lock):
    with lock:
        current = ledger.get(customer, 0)
        ledger[customer] = current + points

ledger = {"C00077": 120}
lock = threading.Lock()
add_points(ledger, "C00077", 30, lock)
add_points(ledger, "C01338", 15, lock)
print(ledger)
`,
      wrong: [
        {
          code: src`
def add_points(ledger, customer, points, lock):
    ledger[customer] = ledger.get(customer, 0) + points
`,
          fails: ["guarded"],
          why: "the update is right, but no lock is held at all",
        },
      ],
      hints: [
        "The read and the write must happen as one step.",
        "Everything that touches `ledger` belongs inside the same `with lock:` block.",
        "Indent the `get` line under `with lock:`.",
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "points",
            label: "add_points() adds to existing and new customers",
            show: "add 30 to C00077 (120) and 15 to new C01338",
            expr: "import threading as _th\n_l = {'C00077': 120}\n_k = _th.Lock()\nadd_points(_l, 'C00077', 30, _k)\nadd_points(_l, 'C01338', 15, _k)\nresult = _l",
            expected: py.dict([[py.str("C00077"), py.int(150)], [py.str("C01338"), py.int(15)]]),
          },
          {
            kind: "expr",
            id: "guarded",
            label: "every access to the ledger happens while the lock is held",
            hidden: true,
            expr: `${GUARDED}\n_lock = _RecLock()\n_Guarded.lock = _lock\n_led = _Guarded({'C1': 5})\nadd_points(_led, 'C1', 2, _lock)\nadd_points(_led, 'C2', 3, _lock)\nresult = [dict(_led), _Guarded.unguarded, _lock.held]`,
            expected: py.list(py.dict([[py.str("C1"), py.int(7)], [py.str("C2"), py.int(3)]]), py.int(0), py.bool(false)),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Replay an interleaving",
        prompt: "Write a simulator for the lost-update bug. Each worker `i` deposits `amounts[i]` in two steps: its first turn reads the balance into its own memory, its second turn writes `what it read + amount`. `schedule` lists whose turn it is, step by step (a worker that has finished ignores further turns). Write `final_balance(start, amounts, schedule)` and return the balance at the end.",
        spec: [
          ["Function", "`final_balance(start, amounts, schedule)`"],
          ["schedule", "a list of worker numbers (positions in `amounts`)"],
          ["Returns", "the balance after following the schedule (a worker that never gets its second turn never writes)"],
          ["Example", "`final_balance(100, [10, 10], [0, 1, 0, 1])` → `110`"],
        ],
        starter: src`
def final_balance(start, amounts, schedule):
    return start

print(final_balance(100, [10, 10], [0, 1, 0, 1]))
`,
        answer: src`
def final_balance(start, amounts, schedule):
    balance = start
    seen = {}
    done = []
    for worker in schedule:
        if worker in done:
            continue
        if worker not in seen:
            seen[worker] = balance
        else:
            balance = seen[worker] + amounts[worker]
            done.append(worker)
    return balance

print(final_balance(100, [10, 10], [0, 1, 0, 1]))
`,
        alternatives: [
          src`
def final_balance(start, amounts, schedule):
    state = {"balance": start}

    def deposit(i):
        read = state["balance"]
        yield
        state["balance"] = read + amounts[i]
        yield

    workers = [deposit(i) for i in range(len(amounts))]
    for i in schedule:
        next(workers[i], None)
    return state["balance"]
`,
        ],
        wrong: [
          {
            code: src`
def final_balance(start, amounts, schedule):
    balance = start
    for worker in range(len(amounts)):
        if worker in schedule:
            balance += amounts[worker]
    return balance
`,
            fails: ["returns"],
            why: "it adds every deposit as if updates were atomic, so a lost update never shows",
          },
          {
            code: src`
def final_balance(start, amounts, schedule):
    balance = start
    seen = {}
    for worker in schedule:
        if worker not in seen:
            seen[worker] = balance
        else:
            balance = seen[worker] + amounts[worker]
    return balance
`,
            fails: ["returns"],
            why: "a finished worker that gets another turn writes again instead of ignoring it",
          },
        ],
        hints: [
          "Each worker needs its own memory of the balance it read: a dictionary from worker number to that value.",
          "A worker's first turn records the current balance; its second turn sets the balance from what it stored.",
          "Remember which workers have finished, and skip their later turns.",
        ],
        task: {
          checks: [
            fn("returns", "final_balance", [
              example([100, [10, 10], [0, 1, 0, 1]], 110),
              example([100, [10, 10], [0, 0, 1, 1]], 120),
              example([50, [5], [0, 0]], 55),
              hiddenCase("three workers, one update lost", [0, [1, 2, 4], [0, 0, 1, 2, 1, 2]], 5),
              hiddenCase("a worker that never writes", [100, [10, 20], [0, 1, 1]], 120),
              hiddenCase("extra turns for a finished worker", [10, [5], [0, 0, 0, 0]], 15),
              hiddenCase("no turns at all", [42, [1, 2], []], 42),
              hiddenCase("a finished worker gets a turn after another worker wrote", [0, [5, 1], [0, 0, 1, 1, 0]], 6),
            ], { label: "final_balance() replays the schedule" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Reserve stock without overselling",
        prompt: "Several checkout threads reserve stock from one inventory. A reservation must **check** that enough stock is left and **subtract** it as one step, or two threads can both see the last item and both sell it. Write a class `Inventory(stock, lock_factory=threading.Lock)` whose `reserve(sku, quantity)` does that under a lock and returns `True` or `False`.",
        spec: [
          ["Class", "`Inventory(stock, lock_factory=threading.Lock)`; `stock` is a dictionary SKU → quantity; keep it as `self.stock`"],
          ["reserve(sku, quantity)", "if the SKU has at least `quantity`, subtract it and return `True`; otherwise change nothing and return `False` (an unknown SKU has 0)"],
          ["Rule", "create one lock with `lock_factory()` in `__init__`; every read and write of `self.stock` happens while it is held"],
        ],
        starter: src`
import threading

class Inventory:
    def __init__(self, stock, lock_factory=threading.Lock):
        self.stock = stock

    def reserve(self, sku, quantity):
        return False

shop = Inventory({"SPO-11681": 2})
print(shop.reserve("SPO-11681", 2), shop.reserve("SPO-11681", 1), shop.stock)
`,
        answer: src`
import threading

class Inventory:
    def __init__(self, stock, lock_factory=threading.Lock):
        self.stock = stock
        self.lock = lock_factory()

    def reserve(self, sku, quantity):
        with self.lock:
            available = self.stock.get(sku, 0)
            if available < quantity:
                return False
            self.stock[sku] = available - quantity
            return True

shop = Inventory({"SPO-11681": 2})
print(shop.reserve("SPO-11681", 2), shop.reserve("SPO-11681", 1), shop.stock)
`,
        alternatives: [
          src`
import threading

class Inventory:
    def __init__(self, stock, lock_factory=threading.Lock):
        self.stock = stock
        self._guard = lock_factory()

    def reserve(self, sku, quantity):
        self._guard.acquire()
        try:
            if sku in self.stock and self.stock[sku] >= quantity:
                self.stock[sku] = self.stock[sku] - quantity
                return True
            return False
        finally:
            self._guard.release()
`,
        ],
        wrong: [
          {
            code: src`
import threading

class Inventory:
    def __init__(self, stock, lock_factory=threading.Lock):
        self.stock = stock
        self.lock = lock_factory()

    def reserve(self, sku, quantity):
        available = self.stock.get(sku, 0)
        if available < quantity:
            return False
        with self.lock:
            self.stock[sku] = available - quantity
        return True
`,
            fails: ["guarded"],
            why: "the check happens outside the lock, so two threads can both pass it before either subtracts",
          },
          {
            code: src`
import threading

class Inventory:
    def __init__(self, stock, lock_factory=threading.Lock):
        self.stock = stock
        self.lock = lock_factory()

    def reserve(self, sku, quantity):
        with self.lock:
            self.stock[sku] = self.stock.get(sku, 0) - quantity
            return self.stock[sku] >= 0
`,
            fails: ["reserve", "guarded"],
            why: "a refused reservation still subtracts, leaving negative stock",
          },
        ],
        hints: [
          "Create the lock once, in `__init__`, with `lock_factory()`.",
          "In `reserve`, the read of the stock, the comparison and the subtraction all go inside one `with` block on the lock you created.",
          "Return `False` without changing anything when there isn't enough.",
        ],
        task: {
          checks: [
            {
              kind: "expr",
              id: "reserve",
              label: "reserve() subtracts when there is enough and refuses otherwise",
              show: "stock 2: reserve 2, then reserve 1, then an unknown SKU",
              expr: "_inv = Inventory({'SPO-11681': 2})\nresult = [_inv.reserve('SPO-11681', 2), _inv.reserve('SPO-11681', 1), _inv.reserve('XXX', 1), _inv.stock]",
              expected: py.list(yes, py.bool(false), py.bool(false), py.dict([[py.str("SPO-11681"), py.int(0)]])),
            },
            {
              kind: "expr",
              id: "guarded",
              label: "every access to the stock happens while the lock is held",
              hidden: true,
              expr: `${GUARDED}\n_made = []\ndef _factory():\n    _made.append(_RecLock())\n    _Guarded.lock = _made[-1]\n    return _made[-1]\n_inv = Inventory(_Guarded({'A': 3}), lock_factory=_factory)\n_r = [_inv.reserve('A', 2), _inv.reserve('A', 2), _inv.reserve('B', 1)]\nresult = [_r, dict(_inv.stock), _Guarded.unguarded, len(_made)]`,
              expected: py.list(py.list(yes, py.bool(false), py.bool(false)), py.dict([[py.str("A"), py.int(1)]]), py.int(0), py.int(1)),
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
def add(counter, amount):
    value = counter["n"]
    yield
    counter["n"] = value + amount
    yield

counter = {"n": 0}
a = add(counter, 1)
b = add(counter, 1)
c = add(counter, 1)
for worker in [a, b, c, a, b, c]:
    next(worker, None)
print(counter["n"])
`,
        choices: ["1", "3", "2", "0"],
        answer: 0,
        why: "All three read 0 before anyone writes, so each writes 0 + 1: two of the three increments are lost.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `if stock[sku] > 0:` outside the lock, then `with lock: stock[sku] -= 1`. What can still go wrong?",
        choices: [
          "Two threads both pass the check on the last item, and both subtract, leaving -1",
          "Nothing: the subtraction is locked",
          "The lock deadlocks",
          "The check raises an error",
        ],
        answer: 0,
        why: "The check and the update must be one step. Put both inside the same `with lock:` block.",
      },
      {
        id: "q3",
        prompt: "Eight threads each compute a total for one region. What is the simplest safe design?",
        choices: [
          "Each thread writes its own region's key (or slot); the main thread combines the totals after join",
          "All threads add into one shared running total without a lock",
          "Wrap each thread's entire work in one global lock",
          "Use the GIL instead of a lock",
        ],
        answer: 0,
        why: "If threads don't share what they update, there is nothing to lock. One global lock around everything would make the threads run one at a time.",
      },
    ],
    review: [
      "A read-modify-write split by a thread switch loses updates silently.",
      "`with lock:` around the whole check-and-update makes it one step; create the lock once and share it.",
      "Share less where you can: separate results per thread, or a `queue.Queue` to hand work over.",
      "Next: processes, which run Python on several cores at once.",
    ],
  },

  // ------------------------------------------------------------------ PY-L38-04 processes
  {
    id: "PY-L38-04",
    version: 2,
    slug: "processes-and-pickling",
    title: "Processes: parallel work, separate memory",
    lede: "Each process has its own interpreter, its own memory and its own GIL, so CPU-heavy Python really runs on several cores at once. The price: everything sent to a process and back is copied by pickling.",
    focus: "Split CPU work into chunks for a process pool, and keep what crosses the boundary picklable.",
    minutes: 24,
    objectives: [
      "Explain why processes, not threads, speed up CPU-bound Python on standard CPython",
      "Know what crosses a process boundary: pickled arguments and results; functions by name",
      "Split work into chunks, map a top-level function over them, and combine the partial results",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "comment", "comment-out", "comparison", "conditional-expr", "counter-call", "dict-get", "dict-iterate", "dict-literal", "dict-lookup", "dict-update", "encoding-arg", "except-type", "file-open", "for-loop", "function-def", "function-default", "function-param", "function-return", "identity", "if-statement", "import-module", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "map-call", "membership", "module-file", "nested-loop", "newline-escape", "package-import", "pool-submit", "precedence", "print-call", "print-several", "print-text", "range-call", "string-format", "string-index", "string-slice", "string-split", "top-level-indent", "try-except", "tuple-literal", "tuple-unpack", "with-statement"],
    teaches: ["process-start"],
    blocks: [
      {
        kind: "text",
        md: "Threads share one interpreter and its GIL, so pure-Python computation in threads runs one thread at a time. A **process** is a whole separate Python interpreter, with its own memory and its own GIL, so eight processes can compute on eight cores at once. `concurrent.futures.ProcessPoolExecutor` gives processes the same `submit`/`map` interface as the thread pool (“Executors and futures”).\n\nProcesses don't share memory. Arguments travel to the worker and results travel back as bytes made by **pickle**, Python's object serializer. That has consequences you can see right here, because pickling works in this page even though starting processes doesn't.",
      },
      {
        kind: "example",
        title: "What survives the trip to another process",
        code: src`
import importlib
import pickle

with open("fares.py", "w", encoding="utf-8") as f:
    f.write("def zone_total(rows):\n    return sum(row['fare'] for row in rows)\n")
importlib.invalidate_caches()
from fares import zone_total

job = (zone_total, [{"fare": 40.8}, {"fare": 7.2}])
data = pickle.dumps(job)
func, rows = pickle.loads(data)
print(func is zone_total, func(rows), rows is job[1])
try:
    pickle.dumps(lambda rows: len(rows))
except pickle.PicklingError:
    print("PicklingError")
`,
        output: "True 48.0 False\nPicklingError\n",
        note: "A top-level function is pickled **by name** (here `fares.zone_total`; in a script, `__main__.zone_total`) and looked up again on the other side, so it must be defined at the top level of a module. The example writes the worker into `fares.py` and imports it, as larger projects do: worker processes import it too. The rows arrive as a copy (`rows is job[1]` is False): changes a worker makes never reach the parent. A lambda has no importable name, so it can't be sent. (Never unpickle data from an untrusted source: unpickling can run code.)",
      },
      {
        kind: "error-example",
        title: "A process pool in this page",
        code: src`
from concurrent.futures import ProcessPoolExecutor

with ProcessPoolExecutor(max_workers=2) as pool:
    print(pool.submit(len, "SPO-11681").result())
`,
        error: "NotImplementedError",
        output: "",
        note: "The browser build can't create processes, so the pool refuses at once. On a computer this prints 9.",
      },
      {
        kind: "text",
        md: "Process pools work best with a few **big** jobs: each job pays for pickling its data and its result, and starting the worker processes takes time. So split the input into one chunk per worker, map a top-level function over the chunks, and combine the partial results in the parent. The example runs that shape with the built-in `map`; on a computer you replace `map` with `pool.map`.",
      },
      {
        kind: "example",
        title: "Count pickups per zone in chunks",
        code: src`
from collections import Counter

def count_zones(lines):
    counts = Counter()
    for line in lines:
        counts[line.split(",")[1]] += 1
    return counts

def chunked(items, size):
    return [items[i:i + size] for i in range(0, len(items), size)]

lines = [f"{16126 + i},{(i * 7) % 5}" for i in range(20)]
# On a computer, under the __main__ guard: with ProcessPoolExecutor() as pool: partials = list(pool.map(count_zones, chunked(lines, 6)))
partials = list(map(count_zones, chunked(lines, 6)))
total = Counter()
for part in partials:
    total += part
print(len(partials), dict(sorted(total.items())))
`,
        output: "4 {'0': 4, '1': 4, '2': 4, '3': 4, '4': 4}\n",
        note: "With processes the program becomes `with ProcessPoolExecutor() as pool: partials = list(pool.map(count_zones, chunked(lines, 6)))`, placed under `if __name__ == \"__main__\":`. That guard (see Modules & Packages) matters: on Windows and macOS each worker starts by importing your main module, and without the guard the import would start a pool of its own.",
      },
      {
        kind: "text",
        md: "**When to use processes:** CPU-heavy pure-Python work (parsing, simulation, image or text processing) that can be split into independent chunks. **When not to:** small jobs (start-up and pickling cost more than the work), jobs needing large shared data (it is copied to every worker), and waiting-bound work (threads or asyncio are lighter). **Mistakes to avoid:** lambdas or nested functions as the worker; expecting a worker's changes to globals to be visible in the parent; and forgetting the `__main__` guard.",
      },
    ],
    tryIt: {
      id: "try",
      title: "A worker that can be sent to a process",
      prompt: "`make_job` returns the function a process should run and its data, but the function is a lambda, which can't be pickled. Replace it with a top-level function named `fare_sum` that adds up the fares, return that instead, and run it: the check then sends the job through a pickle round trip, as a process pool would.",
      spec: [
        ["Function", "`make_job(rows)` returns `(function, rows)`"],
        ["Rule", "the function is a top-level `fare_sum(rows)` that returns the sum of the rows' `\"fare\"` values"],
      ],
      starter: src`
import pickle

def make_job(rows):
    return (lambda rows: sum(row["fare"] for row in rows), rows)

func, rows = make_job([{"fare": 40.8}, {"fare": 7.2}])
print(func(rows))
`,
      answer: src`
import pickle

def fare_sum(rows):
    return sum(row["fare"] for row in rows)

def make_job(rows):
    return (fare_sum, rows)

func, rows = make_job([{"fare": 40.8}, {"fare": 7.2}])
print(func(rows))
`,
      wrong: [
        {
          code: src`
def make_job(rows):
    def fare_sum(rows):
        return sum(row["fare"] for row in rows)
    return (fare_sum, rows)
`,
          fails: ["travels"],
          why: "a function defined inside another one has no importable name either, so it can't be pickled",
        },
      ],
      hints: [
        "Pickle stores a function as its module and name, then looks it up again.",
        "So the function must be defined with `def` at the top level of the file.",
        "Define `fare_sum(rows)` above `make_job` and return it with the rows.",
      ],
      task: {
        checks: [
          {
            kind: "expr",
            id: "travels",
            label: "the job survives a pickle round trip and still works",
            show: "pickle.loads(pickle.dumps(make_job(rows)))",
            expr: asMainModule(["import pickle as _pk", "try:", "    _f, _r = _pk.loads(_pk.dumps(make_job([{'fare': 40.8}, {'fare': 7.2}, {'fare': 2.0}])))", "    result = _f(_r)", "except Exception as _e:", "    result = type(_e).__name__"]),
            expected: py.float(50),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Split work evenly between workers",
        prompt: "A process pool runs fastest when every worker gets about the same amount. Write `split_evenly(items, workers)`: split `items` into `workers` consecutive chunks whose sizes differ by at most one, larger chunks first, keeping the original order. With fewer items than workers, make one chunk per item (no empty chunks).",
        spec: [
          ["Function", "`split_evenly(items, workers)`"],
          ["Returns", "a list of lists; joined back together they are `items`; sizes differ by at most 1, larger first; no empty chunk"],
          ["Example", "`split_evenly([1, 2, 3, 4, 5, 6, 7], 3)` → `[[1, 2, 3], [4, 5], [6, 7]]`"],
        ],
        starter: src`
def split_evenly(items, workers):
    return [items]

print(split_evenly([1, 2, 3, 4, 5, 6, 7], 3))
`,
        answer: src`
def split_evenly(items, workers):
    count = min(workers, len(items))
    chunks = []
    start = 0
    for i in range(count):
        size = len(items) // count
        if i < len(items) % count:
            size += 1
        chunks.append(items[start:start + size])
        start += size
    return chunks

print(split_evenly([1, 2, 3, 4, 5, 6, 7], 3))
`,
        alternatives: [
          src`
def split_evenly(items, workers):
    n = min(workers, len(items))
    if n == 0:
        return []
    base, extra = divmod(len(items), n)
    out = []
    i = 0
    for k in range(n):
        size = base + (1 if k < extra else 0)
        out.append(list(items[i:i + size]))
        i += size
    return out
`,
        ],
        wrong: [
          {
            code: src`
def split_evenly(items, workers):
    size = len(items) // workers + 1
    return [items[i:i + size] for i in range(0, len(items), size)]
`,
            fails: ["returns"],
            why: "a fixed chunk size can leave a tiny last chunk (or fewer chunks than workers)",
          },
          {
            code: src`
def split_evenly(items, workers):
    chunks = [[] for _ in range(workers)]
    for i, item in enumerate(items):
        chunks[i % workers].append(item)
    return chunks
`,
            fails: ["returns"],
            why: "dealing items round-robin breaks the original order, and leaves empty chunks when there are few items",
          },
        ],
        hints: [
          "The number of chunks is the smaller of `workers` and the number of items.",
          "Each chunk gets `len(items) // count` items, and the first `len(items) % count` chunks get one extra.",
          "Walk a start position along the list, slicing out each chunk in turn.",
        ],
        task: {
          checks: [
            fn("returns", "split_evenly", [
              example([[1, 2, 3, 4, 5, 6, 7], 3], [[1, 2, 3], [4, 5], [6, 7]]),
              example([["a", "b", "c", "d"], 2], [["a", "b"], ["c", "d"]]),
              example([[1, 2], 5], [[1], [2]]),
              hiddenCase("no items", [[], 4], []),
              hiddenCase("one worker", [[1, 2, 3], 1], [[1, 2, 3]]),
              hiddenCase("ten items for four workers", [[0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4], [[0, 1, 2], [3, 4, 5], [6, 7], [8, 9]]),
            ], { label: "split_evenly() balances the chunks" }),
            fn("keeps-input", "split_evenly", [keepsInput([[1, 2, 3], 2])], { label: "split_evenly() leaves the list unchanged" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Zone totals with a process-friendly design",
        prompt: "Write `parallel_totals(trips, workers, map_fn=map)`: split the trips evenly between `workers` (as in Challenge 1), compute a partial `{zone: fare total}` per chunk with a **top-level** function, and combine the partials. `map_fn` is how chunks are processed: the built-in `map` here, `pool.map` on a computer. The checker passes a `map_fn` that pickles the function and every chunk, exactly as a process pool would, so a lambda or nested worker fails.",
        spec: [
          ["Function", "`parallel_totals(trips, workers, map_fn=map)`"],
          ["trips", "a list of `{\"zone\": str, \"fare\": number}`"],
          ["Returns", "`{zone: total fare}` over all trips"],
          ["Rule", "process the chunks with `map_fn(worker_function, chunks)`; the worker function is defined at the top level"],
        ],
        starter: src`
def parallel_totals(trips, workers, map_fn=map):
    return {}

trips = [{"zone": "132", "fare": 70.0}, {"zone": "186", "fare": 40.8}, {"zone": "132", "fare": 52.5}]
print(parallel_totals(trips, 2))
`,
        answer: src`
def chunk_totals(chunk):
    totals = {}
    for trip in chunk:
        totals[trip["zone"]] = totals.get(trip["zone"], 0) + trip["fare"]
    return totals

def split_evenly(items, workers):
    count = min(workers, len(items))
    chunks = []
    start = 0
    for i in range(count):
        size = len(items) // count + (1 if i < len(items) % count else 0)
        chunks.append(items[start:start + size])
        start += size
    return chunks

def parallel_totals(trips, workers, map_fn=map):
    combined = {}
    for partial in map_fn(chunk_totals, split_evenly(trips, workers)):
        for zone, total in partial.items():
            combined[zone] = combined.get(zone, 0) + total
    return combined

trips = [{"zone": "132", "fare": 70.0}, {"zone": "186", "fare": 40.8}, {"zone": "132", "fare": 52.5}]
print(parallel_totals(trips, 2))
`,
        alternatives: [
          src`
from collections import Counter

def zone_counter(chunk):
    c = Counter()
    for t in chunk:
        c[t["zone"]] += t["fare"]
    return c

def parallel_totals(trips, workers, map_fn=map):
    n = max(1, min(workers, len(trips)))
    size = max(1, -(-len(trips) // n))
    chunks = [trips[i:i + size] for i in range(0, len(trips), size)]
    total = Counter()
    for part in map_fn(zone_counter, chunks):
        total.update(part)
    return dict(total)
`,
        ],
        wrong: [
          {
            code: src`
def parallel_totals(trips, workers, map_fn=map):
    size = max(1, len(trips) // workers)
    chunks = [trips[i:i + size] for i in range(0, len(trips), size)]

    def chunk_totals(chunk):
        totals = {}
        for trip in chunk:
            totals[trip["zone"]] = totals.get(trip["zone"], 0) + trip["fare"]
        return totals

    combined = {}
    for partial in map_fn(chunk_totals, chunks):
        for zone, total in partial.items():
            combined[zone] = combined.get(zone, 0) + total
    return combined
`,
            fails: ["process-map"],
            why: "the worker is a nested function, which a process pool can't pickle",
          },
          {
            code: src`
def chunk_totals(chunk):
    totals = {}
    for trip in chunk:
        totals[trip["zone"]] = totals.get(trip["zone"], 0) + trip["fare"]
    return totals

def parallel_totals(trips, workers, map_fn=map):
    size = max(1, len(trips) // workers)
    chunks = [trips[i:i + size] for i in range(0, len(trips), size)]
    combined = {}
    for partial in map_fn(chunk_totals, chunks):
        combined.update(partial)
    return combined
`,
            fails: ["returns", "process-map"],
            why: "`update` replaces a zone's total from one chunk with the next chunk's, instead of adding them",
          },
        ],
        hints: [
          "Write the per-chunk work as a top-level function: it receives a list of trips and returns a dictionary of totals.",
          "Split the trips (your c1 logic), then loop over `map_fn(that_function, chunks)`.",
          "Add each partial's totals into the combined dictionary; the same zone can appear in several chunks.",
        ],
        task: {
          checks: [
            fn("returns", "parallel_totals", [
              example([[{ zone: "132", fare: 70 }, { zone: "186", fare: 40.8 }, { zone: "132", fare: 52.5 }], 2], { "132": 122.5, "186": 40.8 }),
              example([[], 3], {}),
              example([[{ zone: "48", fare: 7.2 }], 4], { "48": 7.2 }),
              hiddenCase("one zone spread over every chunk", [[{ zone: "1", fare: 1 }, { zone: "1", fare: 2 }, { zone: "1", fare: 3 }, { zone: "1", fare: 4 }], 3], { "1": 10 }),
            ], { label: "parallel_totals() adds fares per zone", compare: { numbers: "int-float-equal" } }),
            {
              kind: "expr",
              id: "process-map",
              label: "works when the function and chunks are pickled, as a process pool does",
              hidden: true,
              expr: asMainModule([
                "import pickle as _pk",
                "_calls = [0]",
                "def _process_map(fn, chunks):",
                "    _fn = _pk.loads(_pk.dumps(fn))",
                "    for _c in chunks:",
                "        _calls[0] += 1",
                "        yield _pk.loads(_pk.dumps(_fn(_pk.loads(_pk.dumps(_c)))))",
                "_trips = [{'zone': str(i % 3), 'fare': 1.5} for i in range(10)]",
                "try:",
                "    result = [parallel_totals(_trips, 4, map_fn=_process_map), _calls[0]]",
                "except Exception as _e:",
                "    result = type(_e).__name__",
              ]),
              expected: py.list(py.dict([[py.str("0"), py.float(6)], [py.str("1"), py.float(4.5)], [py.str("2"), py.float(4.5)]]), py.int(4)),
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
import pickle

settings = {"zones": ["132", "186"], "currency": "USD"}
copy_in_worker = pickle.loads(pickle.dumps(settings))
copy_in_worker["zones"].append("48")
print(len(settings["zones"]), copy_in_worker == settings)
`,
        choices: ["2 False", "3 True", "3 False", "2 True"],
        answer: 0,
        why: "Unpickling builds a new copy, so a worker's changes never reach the original (2 zones). After the append the two dictionaries differ.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a script creates a ProcessPoolExecutor at the top level of its main file, with no `if __name__ == \"__main__\":` guard, and runs on macOS. What goes wrong?",
        choices: [
          "Each worker imports the main module to find the function, which runs the pool-creating code again",
          "Nothing: the guard is only style",
          "The lambda workers stop working",
          "The GIL prevents the processes from starting",
        ],
        answer: 0,
        why: "With the spawn start method, workers import the main module. Unguarded top-level code runs in every worker, which then tries to start pools of its own (Python stops it with a RuntimeError).",
      },
      {
        id: "q3",
        prompt: "Which job is a good fit for a process pool?",
        choices: [
          "Parsing 40 large log files with a CPU-heavy pure-Python parser",
          "Making 200 HTTP requests that mostly wait",
          "Adding 1 to each of 100 numbers",
          "Updating one shared dictionary from many workers",
        ],
        answer: 0,
        why: "Big, independent CPU-bound jobs benefit from several cores. Waiting work suits threads, tiny work costs more to send than to do, and processes don't share a dictionary.",
      },
    ],
    review: [
      "Processes have separate memory and separate GILs: CPU-bound Python runs in parallel.",
      "Arguments and results are pickled copies; worker functions must be top-level; never unpickle untrusted data.",
      "Few big chunks, a top-level worker, combine partial results; guard the entry point with `__main__`.",
      "Next: measured numbers that show when threads or processes actually pay off.",
    ],
  },

  // ------------------------------------------------------------------ PY-L38-05 benchmark comparisons
  {
    id: "PY-L38-05",
    version: 2,
    slug: "threads-vs-processes-measured",
    title: "Benchmark comparisons: threads or processes?",
    lede: "Whether threads or processes help depends on the kind of work. These numbers were measured on real CPython; you analyse them to learn the rules that decide.",
    focus: "Read measured serial, thread and process timings, compute speed-ups, and choose a strategy.",
    minutes: 20,
    objectives: [
      "Compute speed-up and efficiency from measured timings",
      "Explain why threads help waiting work and processes help computing work on standard CPython",
      "Recognise when the overhead of processes outweighs the gain",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "comp-if", "comparison", "continue-statement", "dict-comp", "dict-iterate", "dict-literal", "dict-lookup", "else-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "list-mutate", "list-sort", "logical", "membership", "nested-dict", "nested-index", "nested-loop", "none-value", "print-call", "print-several", "print-text", "reassignment", "string-format", "string-index", "top-level-indent"],
    teaches: ["bench-row"],
    blocks: [
      {
        kind: "text",
        md: "The course authors ran one benchmark on **CPython 3.14.3 on an Apple M3 Pro (12 cores)**, using `concurrent.futures` with 8 workers and taking the best of 3 runs. Three workloads:\n\n- **io**: 40 jobs that each wait 0.05 s (`time.sleep`, standing in for a network request);\n- **cpu**: 8 jobs that each add up 2,000,000 squares in pure Python;\n- **tiny**: 2,000 jobs that each add up only 2,000 squares.\n\nThese are measurements from that machine, given to you as data: this page can't run threads or processes, and timings on your own computer will differ. The pattern is what generalises.",
      },
      {
        kind: "example",
        title: "Speed-ups from the measured seconds",
        code: src`
measured = {
    "io": {"serial": 2.134, "threads": 0.271, "processes": 0.363},
    "cpu": {"serial": 0.614, "threads": 0.583, "processes": 0.179},
    "tiny": {"serial": 0.112, "threads": 0.118, "processes": 0.196},
}
for workload, seconds in measured.items():
    threads = seconds["serial"] / seconds["threads"]
    processes = seconds["serial"] / seconds["processes"]
    print(f"{workload:5} threads x{threads:.1f}  processes x{processes:.1f}")
`,
        output: "io    threads x7.9  processes x5.9\ncpu   threads x1.1  processes x3.4\ntiny  threads x0.9  processes x0.6\n",
        note: "**Speed-up** is serial time ÷ parallel time. Waiting work: threads nearly reach the ideal ×8 (the waits overlap); processes help too but pay to start. Computing work: threads gain nothing (one thread at a time holds the GIL); processes use real cores. Tiny jobs: both lose, because sending 2,000 small jobs costs more than doing them.",
      },
      {
        kind: "text",
        md: "**Efficiency** is speed-up ÷ number of workers: how much of the extra hardware you actually used. The cpu workload's ×3.4 with 8 processes is about 43%: start-up, pickling and the fact that 8 jobs don't always split perfectly over the cores all take a share. Measurements like these, not intuition, should decide whether parallel code is worth its complexity.",
      },
      {
        kind: "example",
        title: "Efficiency and a decision rule",
        code: src`
measured = {
    "io": {"serial": 2.134, "threads": 0.271, "processes": 0.363},
    "cpu": {"serial": 0.614, "threads": 0.583, "processes": 0.179},
    "tiny": {"serial": 0.112, "threads": 0.118, "processes": 0.196},
}
workers = 8
for workload, seconds in measured.items():
    best_mode = min(seconds, key=seconds.get)
    efficiency = seconds["serial"] / seconds[best_mode] / workers
    print(workload, best_mode, f"{efficiency:.0%}")
`,
        output: "io threads 98%\ncpu processes 43%\ntiny serial 12%\n",
        note: "`min(seconds, key=seconds.get)` picks the mode with the smallest time. For the tiny workload the fastest mode is plain serial code: parallelism would only add cost.",
      },
      {
        kind: "text",
        md: "**Rules from the data (standard CPython with a GIL):** waiting-bound work → threads (or asyncio, the Async Python module); CPU-bound pure Python in big chunks → processes; small jobs → batch them into bigger chunks or stay serial. Free-threaded builds (3.13t+) and libraries that release the GIL (NumPy, compression, hashing) change the cpu row, which is exactly why you measure on your own setup. **Mistakes to avoid:** expecting ×8 from 8 workers; benchmarking tiny inputs; and comparing numbers from different machines.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Speed-up of one mode",
      prompt: "`speedup` should return how many times faster `mode` is than serial, but it divides the wrong way round. Fix it, and run it: threads on the io workload should be about 7.9.",
      spec: [
        ["Function", "`speedup(seconds, mode)`"],
        ["seconds", "a dictionary like `{\"serial\": 2.134, \"threads\": 0.271, \"processes\": 0.363}`"],
        ["Returns", "serial time ÷ the mode's time"],
      ],
      starter: src`
def speedup(seconds, mode):
    return seconds[mode] / seconds["serial"]

print(speedup({"serial": 2.134, "threads": 0.271, "processes": 0.363}, "threads"))
`,
      answer: src`
def speedup(seconds, mode):
    return seconds["serial"] / seconds[mode]

print(speedup({"serial": 2.134, "threads": 0.271, "processes": 0.363}, "threads"))
`,
      wrong: [
        {
          code: src`
def speedup(seconds, mode):
    return seconds["serial"] - seconds[mode]
`,
          fails: ["returns"],
          why: "the seconds saved are not a speed-up factor",
        },
      ],
      hints: [
        "A speed-up above 1 means the mode is faster than serial.",
        "Faster means a smaller time, so the serial time goes on top.",
        "Swap the two sides of the division.",
      ],
      task: {
        checks: [
          fn("returns", "speedup", [
            example([measured.io, "threads"], 2.134 / 0.271),
            hiddenCase("a slower mode", [measured.tiny, "processes"], 0.112 / 0.196),
            hiddenCase("serial against itself", [measured.cpu, "serial"], py.float(1)),
          ], { label: "speedup() divides serial time by the mode's time" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A speed-up table for every workload",
        prompt: "Write `speedup_table(measured)` that turns measurements like the lesson's into a table of speed-ups: for every workload and every mode except `\"serial\"`, serial time ÷ mode time.",
        spec: [
          ["Function", "`speedup_table(measured)`"],
          ["measured", "`{workload: {\"serial\": s, mode: s, ...}}`; every workload has a serial time"],
          ["Returns", "`{workload: {mode: speed-up}}` without the serial entry"],
        ],
        starter: src`
def speedup_table(measured):
    return {}

measured = {"io": {"serial": 2.134, "threads": 0.271, "processes": 0.363}}
print(speedup_table(measured))
`,
        answer: src`
def speedup_table(measured):
    table = {}
    for workload, seconds in measured.items():
        row = {}
        for mode, time_taken in seconds.items():
            if mode != "serial":
                row[mode] = seconds["serial"] / time_taken
        table[workload] = row
    return table

measured = {"io": {"serial": 2.134, "threads": 0.271, "processes": 0.363}}
print(speedup_table(measured))
`,
        alternatives: [
          src`
def speedup_table(measured):
    return {
        name: {mode: times["serial"] / t for mode, t in times.items() if mode != "serial"}
        for name, times in measured.items()
    }
`,
        ],
        wrong: [
          {
            code: src`
def speedup_table(measured):
    table = {}
    for workload, seconds in measured.items():
        table[workload] = {mode: seconds["serial"] / t for mode, t in seconds.items()}
    return table
`,
            fails: ["returns"],
            why: "the serial entry (always 1.0) is kept in every row",
          },
          {
            code: src`
def speedup_table(measured):
    table = {}
    for workload, seconds in measured.items():
        table[workload] = {mode: t / seconds["serial"] for mode, t in seconds.items() if mode != "serial"}
    return table
`,
            fails: ["returns"],
            why: "it divides the wrong way round: these are slow-down factors",
          },
        ],
        hints: [
          "Loop over the workloads, and inside, over the modes of each workload.",
          "Skip the serial mode itself.",
          "Each speed-up is that workload's serial time divided by the mode's time.",
        ],
        task: {
          checks: [
            fn("returns", "speedup_table", [
              example([{ io: measured.io }], { io: { threads: 2.134 / 0.271, processes: 2.134 / 0.363 } }),
              example([measured], {
                io: { threads: 2.134 / 0.271, processes: 2.134 / 0.363 },
                cpu: { threads: 0.614 / 0.583, processes: 0.614 / 0.179 },
                tiny: { threads: 0.112 / 0.118, processes: 0.112 / 0.196 },
              }),
              example([{}], {}),
              hiddenCase("a workload measured serially only", [{ setup: { serial: 1.5 } }], { setup: {} }),
              hiddenCase("a third mode", [{ io: { serial: 4, threads: 1, asyncio: 0.5 } }], { io: { threads: py.float(4), asyncio: py.float(8) } }),
            ], { label: "speedup_table() computes every speed-up" }),
            fn("keeps-input", "speedup_table", [keepsInput([{ io: { serial: 2, threads: 1 } }])], { label: "speedup_table() leaves the measurements unchanged" }),
          ],
        },
      },
      {
        id: "c2",
        title: "Recommend a strategy from measurements",
        prompt: "Parallel code is harder to maintain, so a team only adopts it when the gain is worth it. Write `recommend(measured, min_gain)`: for each workload, the fastest non-serial mode, but only if its speed-up is at least `min_gain`; otherwise `\"serial\"`.",
        spec: [
          ["Function", "`recommend(measured, min_gain)`"],
          ["Returns", "`{workload: mode}`: the non-serial mode with the smallest time if serial ÷ that time ≥ `min_gain`, else `\"serial\"`; equal times → the mode name that sorts first"],
        ],
        starter: src`
def recommend(measured, min_gain):
    return {}

measured = {"cpu": {"serial": 0.614, "threads": 0.583, "processes": 0.179}}
print(recommend(measured, 1.5))
`,
        answer: src`
def recommend(measured, min_gain):
    choices = {}
    for workload, seconds in measured.items():
        best = None
        for mode in sorted(seconds):
            if mode == "serial":
                continue
            if best is None or seconds[mode] < seconds[best]:
                best = mode
        if best is not None and seconds["serial"] / seconds[best] >= min_gain:
            choices[workload] = best
        else:
            choices[workload] = "serial"
    return choices

measured = {"cpu": {"serial": 0.614, "threads": 0.583, "processes": 0.179}}
print(recommend(measured, 1.5))
`,
        alternatives: [
          src`
def recommend(measured, min_gain):
    out = {}
    for name, times in measured.items():
        options = sorted((t, mode) for mode, t in times.items() if mode != "serial")
        if options and times["serial"] / options[0][0] >= min_gain:
            out[name] = options[0][1]
        else:
            out[name] = "serial"
    return out
`,
        ],
        wrong: [
          {
            code: src`
def recommend(measured, min_gain):
    return {workload: min(seconds, key=seconds.get) for workload, seconds in measured.items()}
`,
            fails: ["returns"],
            why: "it ignores the minimum gain, so a 1.1× improvement is adopted",
          },
          {
            code: src`
def recommend(measured, min_gain):
    choices = {}
    for workload, seconds in measured.items():
        modes = [m for m in seconds if m != "serial"]
        best = max(modes, key=lambda m: seconds[m])
        if seconds["serial"] / seconds[best] >= min_gain:
            choices[workload] = best
        else:
            choices[workload] = "serial"
    return choices
`,
            fails: ["returns"],
            why: "`max` picks the slowest mode instead of the fastest",
          },
        ],
        hints: [
          "For each workload, find the non-serial mode with the smallest time (checking modes in sorted order makes ties go to the first name).",
          "Its speed-up is serial time ÷ its time.",
          "Recommend it only when that speed-up reaches `min_gain`; otherwise recommend serial.",
        ],
        task: {
          checks: [
            fn("returns", "recommend", [
              example([measured, 1.5], { io: "threads", cpu: "processes", tiny: "serial" }),
              example([measured, 6], { io: "threads", cpu: "serial", tiny: "serial" }),
              example([{}, 2], {}),
              hiddenCase("exactly the minimum gain", [{ job: { serial: 3, processes: 1.5 } }, 2], { job: "processes" }),
              hiddenCase("two modes with equal times", [{ job: { serial: 4, threads: 1, asyncio: 1 } }, 2], { job: "asyncio" }),
              hiddenCase("only a serial measurement", [{ job: { serial: 1 } }, 1], { job: "serial" }),
            ], { label: "recommend() picks the fastest mode worth adopting" }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
serial = 0.614
processes = 0.179
workers = 8
speedup = serial / processes
print(round(speedup, 1), round(speedup / workers, 2))
`,
        choices: ["3.4 0.43", "8.0 1.0", "0.3 0.04", "3.4 3.4"],
        answer: 0,
        why: "0.614 ÷ 0.179 ≈ 3.4 times faster; divided over 8 workers that is about 43% efficiency.",
      },
      {
        id: "q2",
        prompt: "A common mistake: \"Threads made our pure-Python image filter only 1.1× faster on 8 cores, so the threading code must be broken.\" What is the likelier explanation?",
        choices: [
          "On standard CPython the GIL lets one thread compute at a time; processes (or a library that releases the GIL) are needed",
          "8 threads is too few",
          "Threads always slow programs down",
          "The filter needs a lock",
        ],
        answer: 0,
        why: "The measured cpu row shows the same: ×1.1 with threads, ×3.4 with processes. The code is fine; the tool is wrong for CPU-bound work.",
      },
      {
        id: "q3",
        prompt: "A job runs 50,000 tiny calculations, each taking a few microseconds. Measured with processes it got slower. What should you try?",
        choices: [
          "Send the work in a few large chunks (or keep it serial)",
          "Use more processes",
          "Use a thread per calculation",
          "Pickle the results twice",
        ],
        answer: 0,
        why: "Each job sent to a process pays for pickling and messaging. Batching into a few chunks per worker makes the work worth sending.",
      },
    ],
    review: [
      "Speed-up = serial ÷ parallel time; efficiency = speed-up ÷ workers.",
      "Measured on CPython 3.14: threads ×7.9 on waiting, ×1.1 on computing; processes ×3.4 on computing, slower on tiny jobs.",
      "Measure on your own workload before adopting parallel code.",
      "Next module: asyncio, a single thread that overlaps waiting without any threads at all.",
    ],
  },
];
