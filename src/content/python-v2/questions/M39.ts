/**
 * M39 practice: ten independent problems on coroutines, tasks, cancellation, semaphores and async request workflows
 * (PY-L39-01 … PY-L39-05).
 *
 * Programs run on real asyncio through browser_loop.py (asyncio.run with a virtual-clock event loop, m39-loop.ts), so
 * checks grade concurrency exactly: elapsed loop time, peak concurrency, which tasks ended cancelled. Request problems
 * use saved_http.py, a stand-in transport answering from saved USGS data after a latency (there is no network here).
 * Coroutine problems are graded by awaiting the learner's coroutine inside checks, so they are labelled "integration";
 * the backoff schedule is a plain function graded by calls.
 * Mix: 1 function implementation, 5 integration (async), 2 debugging, 2 output predictions. Easy: 02, 03, 06, 10.
 * Medium: 12, 13, 16, 19. Hard: 20, 22.
 * Version 2: every question was replaced; saved progress from version 1 does not count as solved.
 */
import type { PyQuestion } from "../model";
import { example, fn, hiddenCase } from "../checks";
import { py } from "@/engine/python/values";
import { LOOP_HEAD, asyncFiles, inLoop } from "../m39-loop";
import { fakeFetch, pyLiteral } from "../lessons/M39";
import { collection, quake } from "../m31-replay";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const yes = py.bool(true);
const files = asyncFiles;
const strs = (...xs: string[]) => py.list(...xs.map((x) => py.str(x)));
const fl = (...xs: number[]) => py.list(...xs.map((x) => py.float(x)));

const q1 = quake("us6000pyf1", 3.7, "76 km NE of Atka, Alaska", 1741008099185, [-173.5094, 52.7395, 75.617]);
const q2 = quake("us6000pwlp", 4.3, "126 km NE of Tobelo, Indonesia", 1741008643113, [128.894, 2.4543, 8.888]);
const q3 = quake("us6000q4mq", 2.6, "143 km SSE of Akutan, Alaska", 1741009393163, [-164.7527, 52.9998, 10]);

export const m39Questions: PyQuestion[] = [
  // ------------------------------------------------------------------ easy
  {
    id: "PY-Q39-02",
    version: 2,
    slug: "predict-task-order",
    title: "Predict: when tasks run",
    format: "output_prediction",
    difficulty: "easy",
    minutes: 6,
    requires: ["arithmetic", "assignment", "async-await", "attr-assign", "class-def", "comment", "finally-clause", "function-def", "function-param", "function-return", "import-module", "init-method", "list-index", "list-literal", "list-mutate", "method-def", "none-value", "print-call", "print-several", "self-name", "string-index", "subclass", "super-call", "task-call", "top-level-indent", "try-except"],
    prompt: "Two report tasks are started, then the main coroutine waits a little and records a checkpoint. Type exactly what the program prints. (The first lines define `run`, the browser's version of `asyncio.run`.)",
    spec: [],
    hiddenKinds: [],
    hints: [
      "`create_task` schedules a task, but it only starts running when the current coroutine reaches an `await`.",
      "Line up the events on the clock: 0.1 s, 0.2 s, 0.3 s.",
      "Awaiting a task that is still running waits until it finishes.",
    ],
    explanation: "`started` is logged before either task runs (they start at the first await). At 0.1 s refunds finishes; at 0.2 s main wakes and logs the checkpoint; at 0.3 s orders finishes. Awaiting both then returns, so the clock reads 0.3.",
    predict: {
      program: LOOP_HEAD + src`
async def report(name, seconds, log):
    await asyncio.sleep(seconds)
    log.append(name)

async def main():
    loop = asyncio.get_running_loop()
    log = []
    first = asyncio.create_task(report("orders", 0.3, log))
    second = asyncio.create_task(report("refunds", 0.1, log))
    log.append("started")
    await asyncio.sleep(0.2)
    log.append("checkpoint")
    await first
    await second
    print(log, round(loop.time(), 2))

run(main())
`,
      output: "['started', 'refunds', 'checkpoint', 'orders'] 0.3\n",
      wrongPredictions: [
        "['started', 'orders', 'refunds', 'checkpoint'] 0.3\n",
        "['refunds', 'started', 'checkpoint', 'orders'] 0.3\n",
        "['started', 'refunds', 'checkpoint', 'orders'] 0.6\n",
        "['started', 'checkpoint', 'orders', 'refunds'] 0.3\n",
      ],
    },
  },
  {
    id: "PY-Q39-03",
    version: 2,
    slug: "cancelled-download-cleanup",
    title: "Fix the download that leaks temp files when cancelled",
    format: "debugging",
    difficulty: "easy",
    minutes: 10,
    requires: ["arithmetic", "assignment", "async-await", "comparison", "except-type", "finally-clause", "for-loop", "function-def", "function-param", "function-return", "import-module", "list-mutate", "membership", "raise-stmt", "range-call", "top-level-indent", "try-except", "while-loop"],
    prompt: "A downloader registers a temporary file before streaming and removes it at the end. When users cancel a download (the task is cancelled mid-stream), the temp file is never removed, and the disk fills up. Fix `download` so the temp file is removed however the download ends, while a cancelled download still ends cancelled.",
    spec: [
      ["Coroutine", "`async def download(url, temp_files, fetch_chunk, chunks)`"],
      ["Effect", "adds `url + \".part\"` to the `temp_files` list, awaits `fetch_chunk(url, i)` for each chunk, removes the temp entry, and returns the number of chunks"],
      ["Rule", "the temp entry is removed after success, error and cancellation; cancellation is not swallowed"],
    ],
    hiddenKinds: ["a download cancelled midway", "a chunk that fails", "a finished download"],
    hints: [
      "Cancellation arrives as an exception at the `await` inside the loop, so the last line never runs.",
      "Which block runs however a `try` block is left?",
      "Put the loop in `try` and the removal in `finally`; don't catch CancelledError.",
    ],
    explanation: "When the task is cancelled, CancelledError is raised at `await fetch_chunk(...)` and the function exits before the removal line. Moving the removal into `finally` runs it on success, error and cancellation alike, and the exception keeps propagating, so the task still ends cancelled. Catching CancelledError and returning would hide the cancellation.",
    code: {
      starter: src`
import asyncio
from browser_loop import run

async def download(url, temp_files, fetch_chunk, chunks):
    temp_files.append(url + ".part")
    for i in range(chunks):
        await fetch_chunk(url, i)
    temp_files.remove(url + ".part")
    return chunks
`,
      answer: src`
import asyncio
from browser_loop import run

async def download(url, temp_files, fetch_chunk, chunks):
    temp_files.append(url + ".part")
    try:
        for i in range(chunks):
            await fetch_chunk(url, i)
        return chunks
    finally:
        temp_files.remove(url + ".part")
`,
      alternatives: [
        src`
import asyncio

async def download(url, temp_files, fetch_chunk, chunks):
    name = url + ".part"
    temp_files.append(name)
    try:
        done = 0
        while done < chunks:
            await fetch_chunk(url, done)
            done += 1
    except BaseException:
        temp_files.remove(name)
        raise
    temp_files.remove(name)
    return chunks
`,
      ],
      wrong: [
        {
          code: src`
import asyncio

async def download(url, temp_files, fetch_chunk, chunks):
    temp_files.append(url + ".part")
    try:
        for i in range(chunks):
            await fetch_chunk(url, i)
    except asyncio.CancelledError:
        temp_files.remove(url + ".part")
        return 0
    temp_files.remove(url + ".part")
    return chunks
`,
          fails: ["cancelled", "error"],
          why: "the cancellation is swallowed (the task ends normally), and a failing chunk still leaks the temp file",
        },
        {
          code: src`
import asyncio

async def download(url, temp_files, fetch_chunk, chunks):
    temp_files.append(url + ".part")
    try:
        for i in range(chunks):
            await fetch_chunk(url, i)
    except Exception:
        temp_files.remove(url + ".part")
        raise
    temp_files.remove(url + ".part")
    return chunks
`,
          fails: ["cancelled"],
          why: "CancelledError isn't an `Exception` subclass, so cancellation still skips the cleanup",
        },
      ],
      task: {
        files,
        checks: [
          {
            kind: "expr",
            id: "finished",
            label: "a finished download returns its chunk count and removes the temp file",
            show: "download('/quakes.csv', temp, fetch_chunk, 3)",
            expr: inLoop([
              "async def _chunk(u, i):",
              "    await asyncio.sleep(0.1)",
              "_temp = []",
              "out = [await download('/quakes.csv', _temp, _chunk, 3), _temp, round(loop.time(), 2)]",
            ]),
            expected: py.list(py.int(3), py.list(), py.float(0.3)),
          },
          {
            kind: "expr",
            id: "cancelled",
            label: "a cancelled download removes its temp file and ends cancelled",
            hidden: true,
            expr: inLoop([
              "async def _chunk(u, i):",
              "    await asyncio.sleep(1)",
              "_temp = ['other.part']",
              "_t = asyncio.create_task(download('/big.csv', _temp, _chunk, 10))",
              "await asyncio.sleep(2.5)",
              "_t.cancel()",
              "try:",
              "    await _t",
              "except asyncio.CancelledError:",
              "    pass",
              "out = [_t.cancelled(), _temp]",
            ]),
            expected: py.list(yes, strs("other.part")),
          },
          {
            kind: "expr",
            id: "error",
            label: "a failing chunk removes the temp file and re-raises",
            hidden: true,
            expr: inLoop([
              "async def _chunk(u, i):",
              "    await asyncio.sleep(0.1)",
              "    if i == 1:",
              "        raise ConnectionError('reset')",
              "_temp = []",
              "try:",
              "    await download('/x', _temp, _chunk, 4)",
              "    _what = 'nothing'",
              "except ConnectionError:",
              "    _what = 'ConnectionError'",
              "out = [_what, _temp]",
            ]),
            expected: py.list(py.str("ConnectionError"), py.list()),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q39-06",
    version: 2,
    slug: "concurrent-checkout",
    title: "Price a basket with overlapping lookups",
    format: "integration",
    difficulty: "easy",
    minutes: 12,
    requires: ["aggregate-call", "arithmetic", "assignment", "async-await", "for-loop", "function-def", "function-param", "function-return", "import-module", "list-comp", "list-literal", "membership", "precedence", "star-args", "task-call", "top-level-indent", "with-statement"],
    prompt: "A checkout needs every item's price and the customer's tax rate, each from a different service. Write `checkout_total(skus, get_price, get_tax_rate, region)` that runs **all** these lookups at the same time and returns the total including tax.",
    spec: [
      ["Coroutine", "`async def checkout_total(skus, get_price, get_tax_rate, region)`"],
      ["Returns", "`sum(prices) * (1 + rate)` where each price is `await get_price(sku)` and the rate is `await get_tax_rate(region)`"],
      ["Rule", "every lookup overlaps: the total time is the slowest single lookup"],
    ],
    hiddenKinds: ["an empty basket", "a slow tax service"],
    hints: [
      "There are `len(skus) + 1` independent waits.",
      "One `asyncio.gather` can run the price lookups and the tax lookup together.",
      "The tax rate can be the first result and the prices the rest (unpack with `*`), or gather them separately inside one gather call.",
    ],
    explanation: "Gathering the tax lookup and every price lookup at once overlaps all the waits, so the checkout takes as long as the slowest service, not the sum. Awaiting the tax rate first and then gathering the prices would add the two waits.",
    code: {
      starter: src`
import asyncio
from browser_loop import run

async def checkout_total(skus, get_price, get_tax_rate, region):
    return 0
`,
      answer: src`
import asyncio
from browser_loop import run

async def checkout_total(skus, get_price, get_tax_rate, region):
    rate, *prices = await asyncio.gather(get_tax_rate(region), *(get_price(sku) for sku in skus))
    return sum(prices) * (1 + rate)
`,
      alternatives: [
        src`
import asyncio

async def checkout_total(skus, get_price, get_tax_rate, region):
    async with asyncio.TaskGroup() as group:
        rate_task = group.create_task(get_tax_rate(region))
        price_tasks = [group.create_task(get_price(s)) for s in skus]
    total = 0
    for t in price_tasks:
        total += t.result()
    return total * (1 + rate_task.result())
`,
      ],
      wrong: [
        {
          code: src`
import asyncio

async def checkout_total(skus, get_price, get_tax_rate, region):
    rate = await get_tax_rate(region)
    prices = await asyncio.gather(*(get_price(sku) for sku in skus))
    return sum(prices) * (1 + rate)
`,
          fails: ["overlap"],
          why: "the tax lookup finishes before the price lookups start, so the two waits add up",
        },
        {
          code: src`
import asyncio

async def checkout_total(skus, get_price, get_tax_rate, region):
    rate, *prices = await asyncio.gather(get_tax_rate(region), *(get_price(sku) for sku in skus))
    return sum(prices) + rate
`,
          fails: ["total", "empty"],
          why: "the rate is added instead of applied as a percentage",
        },
      ],
      task: {
        files,
        checks: [
          {
            kind: "expr",
            id: "total",
            label: "checkout_total() applies the tax to the sum of prices",
            show: "prices 10 and 20, tax 0.25",
            expr: inLoop([
              "async def _rate(r):",
              "    await asyncio.sleep(0.2)",
              "    return 0.25",
              "out = await checkout_total(['A', 'B'], _fetch, _rate, 'TX')",
            ], fakeFetch({ A: 10, B: 20 })),
            expected: py.float(37.5),
          },
          {
            kind: "expr",
            id: "overlap",
            label: "every lookup overlaps",
            hidden: true,
            expr: inLoop([
              "async def _rate(r):",
              "    await asyncio.sleep(0.3)",
              "    return 0.1",
              "await checkout_total(['A', 'B', 'C'], _fetch, _rate, 'CA')",
              "out = round(loop.time(), 2)",
            ], fakeFetch({ A: 1, B: 2, C: 3 }, { A: 0.2, B: 0.25, C: 0.1 })),
            expected: py.float(0.3),
          },
          {
            kind: "expr",
            id: "empty",
            label: "an empty basket costs 0",
            hidden: true,
            expr: inLoop([
              "async def _rate(r):",
              "    await asyncio.sleep(0.1)",
              "    return 0.08",
              "out = await checkout_total([], _fetch, _rate, 'NY')",
            ], fakeFetch({})),
            expected: py.float(0),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q39-10",
    version: 2,
    slug: "backoff-schedule",
    title: "A capped exponential backoff schedule",
    format: "function_implementation",
    difficulty: "easy",
    minutes: 8,
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conditional-expr", "for-loop", "function-def", "function-param", "function-return", "len-call", "list-literal", "list-mutate", "membership", "print-call", "print-several", "range-call", "string-index", "top-level-indent", "while-loop"],
    prompt: "A retrying client waits between attempts: `base`, then twice that, then twice again, but never longer than `cap`. Write `backoff_schedule(attempts, base, cap)` that returns the waits between `attempts` attempts (there is no wait after the last one).",
    spec: [
      ["Function", "`backoff_schedule(attempts, base, cap)`"],
      ["Returns", "a list of `attempts - 1` waits: `min(base * 2 ** i, cap)` for i = 0, 1, …; an empty list for 0 or 1 attempts"],
    ],
    hiddenKinds: ["one attempt", "zero attempts", "the cap reached early", "a cap below the base"],
    hints: [
      "The number of waits is one less than the number of attempts.",
      "The i-th wait doubles `base` i times.",
      "Clip each wait at `cap` with `min`.",
    ],
    explanation: "Between n attempts there are n − 1 waits. Doubling gives exponential backoff, and the cap keeps later waits bounded (an uncapped 10th retry would wait over 8 minutes with a 0.5 s base). `range(attempts - 1)` is empty for 0 or 1 attempts.",
    code: {
      starter: src`
def backoff_schedule(attempts, base, cap):
    return []

print(backoff_schedule(5, 0.5, 3))
`,
      answer: src`
def backoff_schedule(attempts, base, cap):
    waits = []
    for i in range(attempts - 1):
        waits.append(min(base * 2 ** i, cap))
    return waits

print(backoff_schedule(5, 0.5, 3))
`,
      alternatives: [
        src`
def backoff_schedule(attempts, base, cap):
    waits = []
    wait = base
    while len(waits) < attempts - 1:
        waits.append(wait if wait < cap else cap)
        wait *= 2
    return waits
`,
      ],
      wrong: [
        {
          code: src`
def backoff_schedule(attempts, base, cap):
    return [min(base * 2 ** i, cap) for i in range(attempts)]
`,
          fails: ["returns"],
          why: "one wait too many: nothing waits after the last attempt",
        },
        {
          code: src`
def backoff_schedule(attempts, base, cap):
    return [min(base * (i + 1), cap) for i in range(attempts - 1)]
`,
          fails: ["returns"],
          why: "the waits grow linearly, not by doubling",
        },
      ],
      task: {
        checks: [
          fn("returns", "backoff_schedule", [
            example([5, 0.5, 3], fl(0.5, 1, 2, 3)),
            example([3, 1, 60], fl(1, 2)),
            example([1, 0.5, 10], []),
            hiddenCase("zero attempts", [0, 1, 5], []),
            hiddenCase("the cap reached early", [6, 2, 5], fl(2, 4, 5, 5, 5)),
            hiddenCase("a cap below the base", [3, 4, 1], fl(1, 1)),
          ], { label: "backoff_schedule() doubles and caps the waits", compare: { numbers: "int-float-equal" } }),
        ],
      },
    },
  },

  // ------------------------------------------------------------------ medium
  {
    id: "PY-Q39-12",
    version: 2,
    slug: "predict-taskgroup-failure",
    title: "Predict: a TaskGroup when one task fails",
    format: "output_prediction",
    difficulty: "medium",
    minutes: 8,
    requires: ["arithmetic", "assignment", "async-await", "attr-assign", "boolean", "cancel-call", "class-def", "comment", "except-type", "finally-clause", "function-def", "function-default", "function-param", "function-return", "if-statement", "import-module", "init-method", "list-index", "list-literal", "list-mutate", "method-def", "none-value", "print-call", "print-several", "raise-stmt", "reassignment", "self-name", "string-format", "string-index", "subclass", "super-call", "task-call", "top-level-indent", "truthiness", "try-except", "with-statement"],
    prompt: "Three checkout steps run in a TaskGroup and one of them fails. Type exactly what the program prints.",
    spec: [],
    hiddenKinds: [],
    hints: [
      "Line up the steps on the clock: 0.1 s, 0.2 s, 0.5 s.",
      "When a task in a TaskGroup fails, the group cancels the tasks still running.",
      "The group then raises an ExceptionGroup holding the failure(s).",
    ],
    explanation: "At 0.1 s export finishes. At 0.2 s charge raises ValueError, so the group cancels email (which logs `email cancelled` and re-raises) and raises an ExceptionGroup with the one ValueError. Email never reaches 0.5 s, so the clock stops at 0.2.",
    predict: {
      program: LOOP_HEAD + src`
async def job(name, seconds, log, fail=False):
    try:
        await asyncio.sleep(seconds)
        if fail:
            raise ValueError(name)
        log.append(name + " done")
    except asyncio.CancelledError:
        log.append(name + " cancelled")
        raise

async def main():
    loop = asyncio.get_running_loop()
    log = []
    try:
        async with asyncio.TaskGroup() as group:
            group.create_task(job("export", 0.1, log))
            group.create_task(job("charge", 0.2, log, fail=True))
            group.create_task(job("email", 0.5, log))
    except ExceptionGroup as error:
        log.append(f"failed: {len(error.exceptions)}")
    print(log, round(loop.time(), 2))

run(main())
`,
      output: "['export done', 'email cancelled', 'failed: 1'] 0.2\n",
      wrongPredictions: [
        "['export done', 'email done', 'failed: 1'] 0.5\n",
        "['export done', 'failed: 1'] 0.2\n",
        "['export done', 'email cancelled', 'failed: 1'] 0.5\n",
        "['export done', 'email cancelled', 'failed: 3'] 0.2\n",
      ],
    },
  },
  {
    id: "PY-Q39-13",
    version: 2,
    slug: "swallowed-cancellation",
    title: "Fix the worker that can't be stopped",
    format: "debugging",
    difficulty: "medium",
    minutes: 12,
    requires: ["async-await", "boolean", "cancel-call", "except-type", "finally-clause", "function-def", "function-param", "import-module", "list-mutate", "raise-stmt", "top-level-indent", "truthiness", "try-except", "while-loop"],
    prompt: "At shutdown the server cancels its background `heartbeat` task and waits for it, but the task never reports as cancelled: it catches the cancellation, logs it, and returns normally. Fix it so it still logs `\"stopped\"` but ends cancelled.",
    spec: [
      ["Coroutine", "`async def heartbeat(log, every)`: appends `\"beat\"` every `every` seconds forever"],
      ["On cancellation", "append `\"stopped\"`, then let the cancellation continue (the task ends cancelled)"],
    ],
    hiddenKinds: ["cancelled after several beats", "cancelled before the first beat"],
    hints: [
      "What happens to an exception after an `except` block that doesn't raise?",
      "The task only ends as cancelled if CancelledError leaves it.",
      "Keep the logging, then re-raise (a bare `raise`), or move the logging to `finally`.",
    ],
    explanation: "`except BaseException:` catches CancelledError and the function then returns, so the task finishes normally: `cancel()` was ignored and shutdown code can't tell. Re-raising after logging (or logging in `finally`) lets the cancellation complete.",
    code: {
      starter: src`
import asyncio
from browser_loop import run

async def heartbeat(log, every):
    try:
        while True:
            await asyncio.sleep(every)
            log.append("beat")
    except BaseException:
        log.append("stopped")
`,
      answer: src`
import asyncio
from browser_loop import run

async def heartbeat(log, every):
    try:
        while True:
            await asyncio.sleep(every)
            log.append("beat")
    except asyncio.CancelledError:
        log.append("stopped")
        raise
`,
      alternatives: [
        src`
import asyncio

async def heartbeat(log, every):
    try:
        while True:
            await asyncio.sleep(every)
            log.append("beat")
    finally:
        log.append("stopped")
`,
      ],
      wrong: [
        {
          code: src`
import asyncio

async def heartbeat(log, every):
    try:
        while True:
            await asyncio.sleep(every)
            log.append("beat")
    except Exception:
        log.append("stopped")
`,
          fails: ["stops", "early"],
          why: "the task now ends cancelled, but CancelledError isn't an Exception, so `stopped` is never logged",
        },
        {
          code: src`
import asyncio

async def heartbeat(log, every):
    try:
        while True:
            await asyncio.sleep(every)
            log.append("beat")
    except asyncio.CancelledError:
        log.append("stopped")
        return
`,
          fails: ["stops", "early"],
          why: "catching the exact type is right, but returning still swallows the cancellation",
        },
      ],
      task: {
        files,
        checks: [
          {
            kind: "expr",
            id: "stops",
            label: "cancelling the heartbeat logs stopped and ends the task cancelled",
            show: "cancel after 2.5 s with a beat every second",
            expr: inLoop([
              "_log = []",
              "_t = asyncio.create_task(heartbeat(_log, 1))",
              "await asyncio.sleep(2.5)",
              "_t.cancel()",
              "try:",
              "    await _t",
              "except asyncio.CancelledError:",
              "    pass",
              "out = [_log, _t.cancelled()]",
            ]),
            expected: py.list(strs("beat", "beat", "stopped"), yes),
          },
          {
            kind: "expr",
            id: "early",
            label: "cancelled before the first beat",
            hidden: true,
            expr: inLoop([
              "_log = []",
              "_t = asyncio.create_task(heartbeat(_log, 5))",
              "await asyncio.sleep(1)",
              "_t.cancel()",
              "try:",
              "    await _t",
              "except asyncio.CancelledError:",
              "    pass",
              "out = [_log, _t.cancelled()]",
            ]),
            expected: py.list(strs("stopped"), yes),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q39-16",
    version: 2,
    slug: "poll-until-ready",
    title: "Poll a job until it is ready, with a deadline",
    format: "integration",
    difficulty: "medium",
    minutes: 15,
    requires: ["arithmetic", "assignment", "async-await", "boolean", "cancel-call", "function-def", "function-param", "function-return", "if-statement", "import-module", "top-level-indent", "truthiness", "while-loop", "with-statement"],
    prompt: "A report service starts a job and you poll `is_ready()` until it says yes. Write `wait_until_ready(is_ready, interval, deadline)`: await `is_ready()`; if it isn't ready, sleep `interval` seconds and ask again. Return how many times you asked. If the job isn't ready within `deadline` seconds, raise `TimeoutError` (without asking again after the deadline).",
    spec: [
      ["Coroutine", "`async def wait_until_ready(is_ready, interval, deadline)`"],
      ["Returns", "the number of `is_ready()` calls made, including the one that returned True"],
      ["Raises", "`TimeoutError` at `deadline` seconds if it never became ready"],
    ],
    hiddenKinds: ["ready on the first check", "never ready (deadline)", "ready just before the deadline"],
    hints: [
      "A loop: ask, return if ready, otherwise sleep the interval.",
      "Wrap the whole loop in an asyncio timeout block for `deadline` seconds, so the deadline covers both asking and sleeping.",
      "The timeout raises TimeoutError for you when the deadline passes.",
    ],
    explanation: "`asyncio.timeout(deadline)` around the polling loop cancels whatever is awaited at the deadline (a sleep or a check) and raises TimeoutError, so the function can't overrun. Counting calls inside the loop gives the number of checks. A loop that only counts attempts (`deadline / interval`) ignores how long each check takes.",
    code: {
      starter: src`
import asyncio
from browser_loop import run

async def wait_until_ready(is_ready, interval, deadline):
    return 0
`,
      answer: src`
import asyncio
from browser_loop import run

async def wait_until_ready(is_ready, interval, deadline):
    checks = 0
    async with asyncio.timeout(deadline):
        while True:
            checks += 1
            if await is_ready():
                return checks
            await asyncio.sleep(interval)
`,
      alternatives: [
        src`
import asyncio

async def wait_until_ready(is_ready, interval, deadline):
    async def poll():
        n = 0
        while True:
            n += 1
            if await is_ready():
                return n
            await asyncio.sleep(interval)
    return await asyncio.wait_for(poll(), timeout=deadline)
`,
      ],
      wrong: [
        {
          code: src`
import asyncio

async def wait_until_ready(is_ready, interval, deadline):
    checks = 0
    while True:
        checks += 1
        if await is_ready():
            return checks
        await asyncio.sleep(interval)
`,
          fails: ["deadline", "slow-check"],
          why: "no deadline: a job that never finishes is polled forever",
        },
        {
          code: src`
import asyncio

async def wait_until_ready(is_ready, interval, deadline):
    for attempt in range(int(deadline / interval)):
        if await is_ready():
            return attempt + 1
        await asyncio.sleep(interval)
    raise TimeoutError()
`,
          fails: ["deadline", "slow-check"],
          why: "counting attempts ignores how long each check takes, so slow checks run past the deadline",
        },
      ],
      task: {
        files,
        checks: [
          {
            kind: "expr",
            id: "ready",
            label: "returns the number of checks once the job is ready",
            show: "ready on the 3rd check, interval 1, deadline 10",
            expr: inLoop([
              "_n = [0]",
              "async def _ready():",
              "    _n[0] += 1",
              "    await asyncio.sleep(0.1)",
              "    return _n[0] >= 3",
              "out = [await wait_until_ready(_ready, 1, 10), round(loop.time(), 2)]",
            ]),
            expected: py.list(py.int(3), py.float(2.3)),
          },
          {
            kind: "expr",
            id: "deadline",
            label: "a job that never finishes raises TimeoutError at the deadline",
            hidden: true,
            expr: inLoop([
              "async def _never():",
              "    await asyncio.sleep(0.1)",
              "    return False",
              "try:",
              "    await wait_until_ready(_never, 1, 5)",
              "    _what = 'returned'",
              "except TimeoutError:",
              "    _what = 'TimeoutError'",
              "out = [_what, round(loop.time(), 2)]",
            ]),
            expected: py.list(py.str("TimeoutError"), py.float(5)),
          },
          {
            kind: "expr",
            id: "slow-check",
            label: "slow checks still respect the deadline",
            hidden: true,
            expr: inLoop([
              "async def _slow():",
              "    await asyncio.sleep(2)",
              "    return False",
              "try:",
              "    await wait_until_ready(_slow, 1, 4)",
              "    _what = 'returned'",
              "except TimeoutError:",
              "    _what = 'TimeoutError'",
              "out = [_what, round(loop.time(), 2)]",
            ]),
            expected: py.list(py.str("TimeoutError"), py.float(4)),
          },
          {
            kind: "expr",
            id: "first",
            label: "ready on the first check",
            hidden: true,
            expr: inLoop([
              "async def _yes():",
              "    return True",
              "out = [await wait_until_ready(_yes, 1, 3), loop.time()]",
            ]),
            expected: py.list(py.int(1), py.float(0)),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q39-19",
    version: 2,
    slug: "async-queue-workers",
    title: "A fixed pool of async workers",
    format: "integration",
    difficulty: "medium",
    minutes: 18,
    requires: ["arithmetic", "assignment", "async-await", "boolean", "cancel-call", "dict-get", "finally-clause", "for-loop", "function-def", "function-param", "function-return", "import-module", "list-comp", "list-literal", "list-mutate", "list-sort", "logical", "membership", "range-call", "star-args", "string-index", "task-call", "top-level-indent", "truthiness", "try-except", "while-loop"],
    prompt: "A thumbnail service processes uploads with a fixed number of async workers fed from an `asyncio.Queue`, so at most `workers` jobs run at once. Write `process_all(jobs, handle, workers)`: put every job on a queue, start `workers` worker tasks that each take jobs and await `handle(job)` until the queue is empty, and return the results sorted.",
    spec: [
      ["Coroutine", "`async def process_all(jobs, handle, workers)`"],
      ["Rule", "exactly `workers` worker tasks; at most that many `handle` calls at once; every job handled once"],
      ["Returns", "a sorted list of the results"],
    ],
    hiddenKinds: ["more workers than jobs", "no jobs", "uneven job durations"],
    hints: [
      "Fill an `asyncio.Queue` with every job first.",
      "Each worker loops: while the queue isn't empty, `get_nowait()` a job and await `handle(job)`; collect results in a shared list.",
      "Gather the `workers` worker coroutines and sort the results.",
    ],
    explanation: "Because the queue is filled before the workers start, each worker can take jobs with `get_nowait()` until it is empty, so no worker waits forever. With `workers` tasks, at most that many `handle` calls run at once, and a free worker immediately takes the next job, which keeps every worker busy even when job durations differ.",
    code: {
      starter: src`
import asyncio
from browser_loop import run

async def process_all(jobs, handle, workers):
    return []
`,
      answer: src`
import asyncio
from browser_loop import run

async def process_all(jobs, handle, workers):
    queue = asyncio.Queue()
    for job in jobs:
        queue.put_nowait(job)
    results = []

    async def worker():
        while not queue.empty():
            job = queue.get_nowait()
            results.append(await handle(job))

    await asyncio.gather(*(worker() for _ in range(workers)))
    return sorted(results)
`,
      alternatives: [
        src`
import asyncio

async def process_all(jobs, handle, workers):
    queue = asyncio.Queue()
    out = []

    async def worker():
        while True:
            job = await queue.get()
            try:
                out.append(await handle(job))
            finally:
                queue.task_done()

    tasks = [asyncio.create_task(worker()) for _ in range(workers)]
    for job in jobs:
        await queue.put(job)
    await queue.join()
    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
    return sorted(out)
`,
      ],
      wrong: [
        {
          code: src`
import asyncio

async def process_all(jobs, handle, workers):
    return sorted(await asyncio.gather(*(handle(job) for job in jobs)))
`,
          fails: ["limit"],
          why: "no workers at all: every job runs at once",
        },
        {
          code: src`
import asyncio

async def process_all(jobs, handle, workers):
    results = []
    for start in range(0, len(jobs), workers):
        batch = jobs[start:start + workers]
        results += await asyncio.gather(*(handle(job) for job in batch))
    return sorted(results)
`,
          fails: ["uneven"],
          why: "batches wait for their slowest job, so workers sit idle when durations differ",
        },
      ],
      task: {
        files,
        checks: [
          {
            kind: "expr",
            id: "limit",
            label: "at most `workers` jobs run at once and all are handled",
            show: "7 jobs of 0.2 s, 3 workers",
            expr: inLoop([
              "_act = [0, 0]",
              "async def _h(j):",
              "    _act[0] += 1",
              "    _act[1] = max(_act[1], _act[0])",
              "    await asyncio.sleep(0.2)",
              "    _act[0] -= 1",
              "    return j * 2",
              "_r = await process_all([5, 3, 1, 7, 2, 6, 4], _h, 3)",
              "out = [_r, _act[1], round(loop.time(), 2)]",
            ]),
            expected: py.list(py.list(py.int(2), py.int(4), py.int(6), py.int(8), py.int(10), py.int(12), py.int(14)), py.int(3), py.float(0.6)),
          },
          {
            kind: "expr",
            id: "uneven",
            label: "a free worker takes the next job at once",
            hidden: true,
            expr: inLoop([
              "async def _h(s):",
              "    await asyncio.sleep(s)",
              "    return s",
              "await process_all([0.6, 0.2, 0.2, 0.2], _h, 2)",
              "out = round(loop.time(), 2)",
            ]),
            expected: py.float(0.6),
          },
          {
            kind: "expr",
            id: "edges",
            label: "no jobs, and more workers than jobs",
            hidden: true,
            expr: inLoop([
              "async def _h(j):",
              "    await asyncio.sleep(0.1)",
              "    return j",
              "out = [await process_all([], _h, 4), await process_all([2, 1], _h, 5)]",
            ]),
            expected: py.list(py.list(), py.list(py.int(1), py.int(2))),
          },
        ],
      },
    },
  },

  // ------------------------------------------------------------------ hard
  {
    id: "PY-Q39-20",
    version: 2,
    slug: "follow-next-pages",
    title: "Follow next-page links, retrying busy pages",
    format: "integration",
    difficulty: "hard",
    minutes: 22,
    requires: ["arithmetic", "assignment", "async-await", "comparison", "continue-statement", "dict-get", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "list-index", "list-literal", "list-mutate", "logical", "membership", "nested-loop", "none-value", "range-call", "reassignment", "string-index", "top-level-indent", "truthiness", "while-loop"],
    prompt: "An earthquake feed is split into pages; each page's JSON has `\"features\"` and a `\"next\"` URL (`null` on the last page). Pages must be read in order, because each one tells you the next. Write `all_features(transport, first_url, retries)`: follow the links, retrying a page that answers 503 up to `retries` extra times (waiting 0.5 s between tries), and return every feature's `id` in order. A page that still fails, or answers anything else that isn't 200, raises `HTTPStatusError`.",
    spec: [
      ["Coroutine", "`async def all_features(transport, first_url, retries)`"],
      ["Pages", "`{\"features\": [...], \"next\": url or None}`"],
      ["Returns", "the `id` of every feature, page by page"],
      ["Errors", "503 → wait 0.5 s and retry (at most `retries` retries per page); other non-200 statuses, or a 503 after the last retry → `raise_for_status()`"],
    ],
    hiddenKinds: ["a busy page that recovers", "a page that stays busy", "a missing page", "a single page"],
    hints: [
      "Loop while there is a URL: fetch the page, then set the URL to its `next` value.",
      "Fetching one page is its own small loop: on 503 with retries left, sleep 0.5 s and try again.",
      "Anything else that isn't 200 (or a 503 with no retries left) goes to `raise_for_status()`.",
    ],
    explanation: "Pagination by next-links is inherently sequential, so the work is one await per page; the retry loop wraps each page fetch, waiting before each retry and giving up after the budget. `raise_for_status()` turns a 404 or a persistent 503 into a clear `HTTPStatusError` instead of a KeyError later.",
    code: {
      starter: src`
import asyncio
from browser_loop import run
from saved_http import SavedTransport, HTTPStatusError

async def all_features(transport, first_url, retries):
    return []
`,
      answer: src`
import asyncio
from browser_loop import run
from saved_http import SavedTransport, HTTPStatusError

async def get_page(transport, url, retries):
    for attempt in range(retries + 1):
        response = await transport.get(url)
        if response.status == 503 and attempt < retries:
            await asyncio.sleep(0.5)
            continue
        response.raise_for_status()
        return response.json()

async def all_features(transport, first_url, retries):
    ids = []
    url = first_url
    while url is not None:
        page = await get_page(transport, url, retries)
        for feature in page["features"]:
            ids.append(feature["id"])
        url = page["next"]
    return ids
`,
      alternatives: [
        src`
import asyncio

async def all_features(transport, first_url, retries):
    found = []
    url = first_url
    while url:
        left = retries
        response = await transport.get(url)
        while response.status == 503 and left > 0:
            left -= 1
            await asyncio.sleep(0.5)
            response = await transport.get(url)
        response.raise_for_status()
        body = response.json()
        found += [f["id"] for f in body["features"]]
        url = body.get("next")
    return found
`,
      ],
      wrong: [
        {
          code: src`
import asyncio

async def all_features(transport, first_url, retries):
    ids = []
    url = first_url
    while url is not None:
        response = await transport.get(url)
        response.raise_for_status()
        page = response.json()
        ids += [f["id"] for f in page["features"]]
        url = page["next"]
    return ids
`,
          fails: ["recovers", "stays-busy"],
          why: "no retries: one busy answer stops the whole feed",
        },
        {
          code: src`
import asyncio

async def all_features(transport, first_url, retries):
    ids = []
    url = first_url
    while url is not None:
        response = await transport.get(url)
        while response.status != 200:
            await asyncio.sleep(0.5)
            response = await transport.get(url)
        page = response.json()
        ids += [f["id"] for f in page["features"]]
        url = page["next"]
    return ids
`,
          fails: ["stays-busy", "missing"],
          why: "it retries every error forever: a 404 or a permanently busy page never ends",
        },
      ],
      task: {
        files,
        timeoutMs: 8000,
        checks: [
          {
            kind: "expr",
            id: "pages",
            label: "all_features() follows the next links",
            show: "two pages of real USGS events",
            expr: inLoop([
              `_t = SavedTransport({'/p1': {'status': 200, 'body': {'features': ${pyLiteral(collection([q1, q2]).features)}, 'next': '/p2'}, 'seconds': 0.2}, '/p2': {'status': 200, 'body': {'features': ${pyLiteral(collection([q3]).features)}, 'next': None}, 'seconds': 0.2}})`,
              "out = [await all_features(_t, '/p1', 2), round(loop.time(), 2)]",
            ], "from saved_http import SavedTransport"),
            expected: py.list(strs("us6000pyf1", "us6000pwlp", "us6000q4mq"), py.float(0.4)),
          },
          {
            kind: "expr",
            id: "recovers",
            label: "a busy page that recovers",
            hidden: true,
            expr: inLoop([
              "_t = SavedTransport({'/a': {'status': 200, 'body': {'features': [{'id': 'x'}], 'next': '/b'}, 'seconds': 0.1}, '/b': [{'status': 503, 'seconds': 0.1}, {'status': 503, 'seconds': 0.1}, {'status': 200, 'body': {'features': [{'id': 'y'}], 'next': None}, 'seconds': 0.1}]})",
              "out = [await all_features(_t, '/a', 2), round(loop.time(), 2)]",
            ], "from saved_http import SavedTransport"),
            expected: py.list(strs("x", "y"), py.float(1.4)),
          },
          {
            kind: "expr",
            id: "stays-busy",
            label: "a page that stays busy raises after the retries",
            hidden: true,
            expr: inLoop([
              "_t = SavedTransport({'/a': {'status': 503, 'seconds': 0.1}})",
              "try:",
              "    await all_features(_t, '/a', 2)",
              "    _what = 'nothing'",
              "except HTTPStatusError as _e:",
              "    _what = _e.status",
              "out = [_what, len(_t.requests)]",
            ], "from saved_http import SavedTransport, HTTPStatusError"),
            expected: py.list(py.int(503), py.int(3)),
          },
          {
            kind: "expr",
            id: "missing",
            label: "a missing page raises at once",
            hidden: true,
            expr: inLoop([
              "_t = SavedTransport({'/a': {'status': 200, 'body': {'features': [], 'next': '/gone'}, 'seconds': 0.1}})",
              "try:",
              "    await all_features(_t, '/a', 3)",
              "    _what = 'nothing'",
              "except HTTPStatusError as _e:",
              "    _what = _e.status",
              "out = [_what, len(_t.requests)]",
            ], "from saved_http import SavedTransport, HTTPStatusError"),
            expected: py.list(py.int(404), py.int(2)),
          },
        ],
      },
    },
  },
  {
    id: "PY-Q39-22",
    version: 2,
    slug: "per-request-and-overall-deadline",
    title: "Per-request timeouts inside an overall deadline",
    format: "integration",
    difficulty: "hard",
    minutes: 20,
    requires: ["arithmetic", "assignment", "async-await", "cancel-call", "conditional-expr", "dict-comp", "dict-iterate", "dict-literal", "except-type", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "star-args", "string-index", "task-call", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "with-statement"],
    prompt: "A status page checks many services at once. Each check may take at most `per_check` seconds, and the whole page must be ready within `total` seconds. Write `status_page(services, check, per_check, total)`: run every check concurrently; return a dictionary from service to its result, `\"slow\"` when its own timeout hit, `\"error\"` when it raised, or `\"unknown\"` when the overall deadline arrived first.",
    spec: [
      ["Coroutine", "`async def status_page(services, check, per_check, total)`"],
      ["Per check", "`await check(service)` limited to `per_check` seconds → result, `\"slow\"`, or `\"error\"` (any exception)"],
      ["Overall", "after `total` seconds, every unfinished service is `\"unknown\"`, its check cancelled; the coroutine returns by then"],
    ],
    hiddenKinds: ["the overall deadline before the per-check limit", "a check that raises", "every check fast"],
    hints: [
      "Wrap each check in a helper coroutine that applies the per-check timeout and turns timeouts and errors into the two words.",
      "Run the helpers as tasks and wait for them with `asyncio.wait(tasks, timeout=total)`.",
      "Cancel what is still pending; services whose task isn't done are `\"unknown\"`.",
    ],
    explanation: "Two layers of time limit: `asyncio.timeout(per_check)` inside each helper bounds one check, and `asyncio.wait(..., timeout=total)` bounds the page. Converting timeouts and exceptions inside the helper keeps one failure from affecting the others; whatever is still pending at the deadline is cancelled and reported as unknown, so the page is always ready on time.",
    code: {
      starter: src`
import asyncio
from browser_loop import run

async def status_page(services, check, per_check, total):
    return {}
`,
      answer: src`
import asyncio
from browser_loop import run

async def status_page(services, check, per_check, total):
    async def one(service):
        try:
            async with asyncio.timeout(per_check):
                return await check(service)
        except TimeoutError:
            return "slow"
        except Exception:
            return "error"

    tasks = {service: asyncio.create_task(one(service)) for service in services}
    if tasks:
        done, pending = await asyncio.wait(tasks.values(), timeout=total)
        for task in pending:
            task.cancel()
    page = {}
    for service, task in tasks.items():
        page[service] = task.result() if task.done() and not task.cancelled() else "unknown"
    return page
`,
      alternatives: [
        src`
import asyncio

async def status_page(services, check, per_check, total):
    page = {s: "unknown" for s in services}

    async def one(service):
        try:
            page[service] = await asyncio.wait_for(check(service), timeout=per_check)
        except TimeoutError:
            page[service] = "slow"
        except Exception:
            page[service] = "error"

    tasks = [asyncio.create_task(one(s)) for s in services]
    try:
        async with asyncio.timeout(total):
            await asyncio.gather(*tasks)
    except TimeoutError:
        for t in tasks:
            t.cancel()
    return page
`,
      ],
      wrong: [
        {
          code: src`
import asyncio

async def status_page(services, check, per_check, total):
    async def one(service):
        try:
            async with asyncio.timeout(per_check):
                return await check(service)
        except TimeoutError:
            return "slow"
        except Exception:
            return "error"

    results = await asyncio.gather(*(one(s) for s in services))
    return dict(zip(services, results))
`,
          fails: ["overall"],
          why: "no overall deadline: the page waits for the slowest per-check timeout",
        },
        {
          code: src`
import asyncio

async def status_page(services, check, per_check, total):
    page = {}
    try:
        async with asyncio.timeout(total):
            for service in services:
                try:
                    async with asyncio.timeout(per_check):
                        page[service] = await check(service)
                except TimeoutError:
                    page[service] = "slow"
                except Exception:
                    page[service] = "error"
    except TimeoutError:
        pass
    for service in services:
        page.setdefault(service, "unknown")
    return page
`,
          fails: ["mixed", "overall", "fast"],
          why: "the checks run one after another, so later services become unknown although they would have been fast",
        },
      ],
      task: {
        files,
        checks: [
          {
            kind: "expr",
            id: "mixed",
            label: "results, slow and error side by side",
            show: "orders 0.1 s ok, payments 3 s, search raises; per_check 1, total 5",
            expr: inLoop([
              "async def _check(s):",
              "    if s == 'orders':",
              "        await asyncio.sleep(0.1)",
              "        return 'ok'",
              "    if s == 'payments':",
              "        await asyncio.sleep(3)",
              "        return 'ok'",
              "    await asyncio.sleep(0.2)",
              "    raise ConnectionError(s)",
              "_p = await status_page(['orders', 'payments', 'search'], _check, 1, 5)",
              "out = [_p, round(loop.time(), 2)]",
            ]),
            expected: py.list(py.dict([[py.str("orders"), py.str("ok")], [py.str("payments"), py.str("slow")], [py.str("search"), py.str("error")]]), py.float(1)),
          },
          {
            kind: "expr",
            id: "overall",
            label: "the overall deadline arrives before the per-check limit",
            hidden: true,
            expr: inLoop([
              "_cancelled = []",
              "async def _check(s):",
              "    try:",
              "        await asyncio.sleep(2 if s == 'reports' else 0.1)",
              "        return 'ok'",
              "    except asyncio.CancelledError:",
              "        _cancelled.append(s)",
              "        raise",
              "_p = await status_page(['reports', 'cart'], _check, 10, 0.5)",
              "await asyncio.sleep(0)",
              "out = [_p, round(loop.time(), 2), _cancelled]",
            ]),
            expected: py.list(py.dict([[py.str("reports"), py.str("unknown")], [py.str("cart"), py.str("ok")]]), py.float(0.5), strs("reports")),
          },
          {
            kind: "expr",
            id: "fast",
            label: "every check fast",
            hidden: true,
            expr: inLoop([
              "async def _check(s):",
              "    await asyncio.sleep(0.1)",
              "    return len(s)",
              "out = [await status_page(['a', 'bb'], _check, 1, 2), round(loop.time(), 2)]",
            ]),
            expected: py.list(py.dict([[py.str("a"), py.int(1)], [py.str("bb"), py.int(2)]]), py.float(0.1)),
          },
        ],
      },
    },
  },
];
