/**
 * M39 Async Python: five lessons (PY-L39-01 … PY-L39-05).
 *
 * Real asyncio: coroutines and await, tasks with gather and TaskGroup, cancellation and timeouts, semaphores, and an
 * async request workflow with retries. asyncio.run() can't run in a browser page, so programs call `run(main())`, which
 * is `asyncio.run(main, loop_factory=BrowserLoop)`: CPython's own event loop with a virtual clock that jumps to the
 * next timer instead of sleeping (src/content/python-v2/m39-loop.ts). Every task, await, cancellation and timeout is
 * standard asyncio; on a computer the same code runs with `asyncio.run(main())`. Lesson examples show the loop inline
 * (they can't import files); exercises import it from browser_loop.py.
 *
 * Because the clock is exact, checks grade concurrency deterministically: overlapping three 0.2 s waits must finish at
 * 0.2 s, a semaphore of 2 must never let a third request in, a timeout must give up at exactly its limit. The request
 * lesson uses saved_http.py, a stand-in transport answering from real USGS earthquake data (D08) after a latency;
 * there is no network in the page, and the lesson says so.
 * Version 2: rewritten from a module that printed fixed text instead of running coroutines.
 */
import type { PyLesson } from "../model";
import { py } from "@/engine/python/values";
import { LOOP_HEAD, asyncFiles, inLoop } from "../m39-loop";
import { collection, quake } from "../m31-replay";

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

const yes = py.bool(true);
const files = asyncFiles;
const strs = (...xs: string[]) => py.list(...xs.map((x) => py.str(x)));
/** A JS value as a Python literal. */
export const pyLiteral = (x: unknown) => JSON.stringify(x).replace(/null/g, "None").replace(/true/g, "True").replace(/false/g, "False");

/** A fake async lookup for checks: waits `seconds[key]` (default 0.1) and returns `values[key]`, recording calls. */
export const fakeFetch = (values: Record<string, unknown>, seconds: Record<string, number> = {}) =>
  [
    `_values = ${pyLiteral(values)}`,
    `_seconds = ${JSON.stringify(seconds)}`,
    "_calls = []",
    "async def _fetch(key):",
    "    _calls.append(key)",
    "    await asyncio.sleep(_seconds.get(key, 0.1))",
    "    if key not in _values:",
    "        raise KeyError(key)",
    "    return _values[key]",
  ].join("\n");

const q1 = quake("us6000pw77", 4.7, "Arctic Ocean", 1740789594585, [-107.5679, 80.7069, 10]);
const q2 = quake("us6000pw78", 4, "31 km ENE of Firá, Greece", 1740789709252, [25.7319, 36.5643, 10]);
const q3 = quake("us6000pxyr", 4.1, "233 km E of Levuka, Fiji", 1740794122692, [-178.4779, -18.0069, 585.411]);
const q4 = quake("us6000pwlp", 4.3, "126 km NE of Tobelo, Indonesia", 1741008643113, [128.894, 2.4543, 8.888]);
const day = (d: string) => `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2025-03-${d}&minmagnitude=4`;

export const m39Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L39-01 async and await
  {
    id: "PY-L39-01",
    version: 2,
    slug: "coroutines-and-await",
    title: "async and await: coroutines and the event loop",
    lede: "An async function can pause while it waits, letting other work run in the same thread. Calling it doesn't run it; awaiting it does. The event loop decides who runs next.",
    focus: "Write coroutines with async def and await, and run them with an event loop.",
    minutes: 22,
    objectives: [
      "Explain that calling an `async def` function creates a coroutine object, and `await` runs it",
      "Await `asyncio.sleep` and other coroutines, and read the loop's clock",
      "Recognise the forgotten-`await` bug and its error",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "attr-assign", "class-def", "comment", "comparison", "dict-literal", "dict-lookup", "exc-name", "finally-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "init-method", "len-call", "list-index", "list-literal", "list-mutate", "membership", "method-def", "none-value", "precedence", "print-call", "print-several", "print-text", "self-name", "string-index", "string-slice", "subclass", "super-call", "top-level-indent", "try-except", "type-call", "unquoted-name", "while-loop"],
    teaches: ["async-await"],
    blocks: [
      {
        kind: "text",
        md: "Threads overlap waiting by running several things at once. **asyncio** overlaps waiting in a **single thread**: a function declared with `async def` is a **coroutine function**, and inside it `await something` means *pause me here until that is ready, and let other code run meanwhile*. An **event loop** keeps the list of paused coroutines and resumes each one when what it awaits is done. `asyncio.run(main())` creates a loop, runs `main()` to the end and closes the loop.\n\nPython in this page can't call `asyncio.run` directly, so every example starts with a few lines defining `run(main)`: the same `asyncio.run`, given an event loop whose clock jumps to the next timer instead of really waiting. Everything after those lines is ordinary asyncio, and on a computer you would write `asyncio.run(main())` instead.",
      },
      {
        kind: "example",
        title: "Two awaits, one after the other",
        code: LOOP_HEAD + src`
async def fetch_order(order_id, seconds):
    await asyncio.sleep(seconds)
    return {"order_id": order_id, "status": "shipped"}

async def main():
    loop = asyncio.get_running_loop()
    first = await fetch_order("O100282", 0.2)
    second = await fetch_order("O100376", 0.3)
    print(first["order_id"], second["order_id"], round(loop.time(), 2))
    pending = fetch_order("O100918", 0.1)
    print(type(pending).__name__)
    pending.close()

run(main())
`,
        output: "O100282 O100376 0.5\ncoroutine\n",
        note: "`asyncio.sleep(0.2)` stands in for waiting on a server. Awaiting one fetch and then the next takes 0.2 + 0.3 = 0.5 s on the loop's clock: awaits in sequence add up. Calling `fetch_order` without `await` only created a coroutine object; nothing ran (`close()` discards it quietly).",
      },
      {
        kind: "text",
        md: "Coroutines call coroutines with `await`, just as functions call functions. The difference is only at the waits: each `await` is a point where this coroutine may pause. A plain function can't contain `await`, and `await` only works inside `async def`.",
      },
      {
        kind: "example",
        title: "A checkout made of async steps",
        code: LOOP_HEAD + src`
async def load_rates():
    await asyncio.sleep(0.15)
    return {"EUR": 0.92, "GBP": 0.79}

async def load_cart(customer_id):
    await asyncio.sleep(0.1)
    return [{"sku": "SPO-11681", "price": 7.49}, {"sku": "HOM-22847", "price": 31.0}]

async def checkout_total(customer_id, currency):
    rates = await load_rates()
    cart = await load_cart(customer_id)
    total = sum(item["price"] for item in cart)
    return round(total * rates[currency], 2)

async def main():
    loop = asyncio.get_running_loop()
    print(await checkout_total("C00077", "EUR"), round(loop.time(), 2))

print(run(main()))
`,
        output: "35.41 0.25\nNone\n",
        note: "`checkout_total` awaits two other coroutines; the clock shows their waits added up (0.15 + 0.1). `run` returns what `main()` returns, here None. The two loads don't depend on each other, so they could overlap; the next lesson does that with tasks.",
      },
      {
        kind: "error-example",
        title: "Forgetting await",
        code: LOOP_HEAD + src`
async def order_total(order_id):
    await asyncio.sleep(0.1)
    return 35.84

async def main():
    total = order_total("O100282") + 5.99
    print(total)

run(main())
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: unsupported operand type(s) for +: 'coroutine' and 'float'`. Without `await`, `order_total(...)` is a coroutine object, not 35.84. Python also warns `coroutine 'order_total' was never awaited`.",
      },
      {
        kind: "text",
        md: "**When to use asyncio:** programs that spend their time waiting on many network or disk operations (API clients, crawlers, chat servers), especially when there are hundreds or thousands of them: a coroutine costs far less than a thread. **When not to:** CPU-heavy work (a coroutine that computes never reaches an `await`, so nothing else runs: use processes, the Threading & Multiprocessing module). **Mistakes to avoid:** forgetting `await`; calling blocking functions such as `time.sleep` or a synchronous HTTP library inside a coroutine (it freezes every coroutine on the loop); and awaiting independent operations one after another when they could overlap.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Await the stock check",
      prompt: "`can_ship` should await the stock lookup, but it compares the coroutine object itself, which raises TypeError. Add the missing `await` and run it.",
      spec: [
        ["Coroutine", "`async def can_ship(sku, get_stock)`"],
        ["Returns", "`True` when `await get_stock(sku)` is more than 0"],
      ],
      starter: src`
import asyncio
from browser_loop import run

async def can_ship(sku, get_stock):
    stock = get_stock(sku)
    return stock > 0

async def get_stock(sku):
    await asyncio.sleep(0.1)
    return {"SPO-11681": 4, "HOM-22847": 0}[sku]

async def main():
    print(await can_ship("SPO-11681", get_stock), await can_ship("HOM-22847", get_stock))

run(main())
`,
      answer: src`
import asyncio
from browser_loop import run

async def can_ship(sku, get_stock):
    stock = await get_stock(sku)
    return stock > 0

async def get_stock(sku):
    await asyncio.sleep(0.1)
    return {"SPO-11681": 4, "HOM-22847": 0}[sku]

async def main():
    print(await can_ship("SPO-11681", get_stock), await can_ship("HOM-22847", get_stock))

run(main())
`,
      wrong: [
        {
          code: src`
import asyncio

async def can_ship(sku, get_stock):
    return True
`,
          fails: ["ship"],
          why: "it never looks at the stock",
        },
      ],
      hints: [
        "`get_stock(sku)` gives back a coroutine, not a number.",
        "Something has to run that coroutine and wait for its result.",
        "Put `await` in front of the call.",
      ],
      task: {
        files,
        checks: [
          {
            kind: "expr",
            id: "ship",
            label: "can_ship() follows the awaited stock level",
            show: "await can_ship('A', get_stock), await can_ship('B', get_stock)",
            expr: inLoop(["out = [await can_ship('A', _fetch), await can_ship('B', _fetch)]"], fakeFetch({ A: 4, B: 0 })),
            expected: py.list(yes, py.bool(false)),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Total an order's lines one by one",
        prompt: "Write a coroutine `order_total(order_id, get_lines, get_price)`: await `get_lines(order_id)` for the order's lines (each `{\"sku\": ..., \"qty\": ...}`), then await `get_price(sku)` for each line, and return the sum of price × quantity. (Lookups happen one after another here; the next lesson overlaps them.)",
        spec: [
          ["Coroutine", "`async def order_total(order_id, get_lines, get_price)`"],
          ["Returns", "the total of `await get_price(line[\"sku\"]) * line[\"qty\"]` over the lines; `0` for no lines"],
          ["Rule", "await each lookup; call `get_price` once per line"],
        ],
        starter: src`
import asyncio
from browser_loop import run

async def order_total(order_id, get_lines, get_price):
    return 0

async def get_lines(order_id):
    await asyncio.sleep(0.1)
    return [{"sku": "SPO-11681", "qty": 2}, {"sku": "HOM-22847", "qty": 1}]

async def get_price(sku):
    await asyncio.sleep(0.05)
    return {"SPO-11681": 7.49, "HOM-22847": 31.0}[sku]

print(run(order_total("O100282", get_lines, get_price)))
`,
        answer: src`
import asyncio
from browser_loop import run

async def order_total(order_id, get_lines, get_price):
    total = 0
    for line in await get_lines(order_id):
        price = await get_price(line["sku"])
        total += price * line["qty"]
    return total

async def get_lines(order_id):
    await asyncio.sleep(0.1)
    return [{"sku": "SPO-11681", "qty": 2}, {"sku": "HOM-22847", "qty": 1}]

async def get_price(sku):
    await asyncio.sleep(0.05)
    return {"SPO-11681": 7.49, "HOM-22847": 31.0}[sku]

print(run(order_total("O100282", get_lines, get_price)))
`,
        alternatives: [
          src`
async def order_total(order_id, get_lines, get_price):
    lines = await get_lines(order_id)
    amounts = []
    for line in lines:
        amounts.append(line["qty"] * await get_price(line["sku"]))
    return sum(amounts)
`,
        ],
        wrong: [
          {
            code: src`
async def order_total(order_id, get_lines, get_price):
    total = 0
    for line in await get_lines(order_id):
        total += line["qty"]
    return total
`,
            fails: ["total"],
            why: "it adds up quantities and never prices the lines",
          },
          {
            code: src`
async def order_total(order_id, get_lines, get_price):
    total = 0
    for line in get_lines(order_id):
        total += await get_price(line["sku"]) * line["qty"]
    return total
`,
            fails: ["total", "empty"],
            why: "`get_lines` isn't awaited, so the loop tries to iterate a coroutine (TypeError)",
          },
        ],
        hints: [
          "First await the lines; the result is a list you can loop over.",
          "Inside the loop, await the price of each line's SKU.",
          "Multiply by the quantity and add up; return the total at the end.",
        ],
        task: {
          files,
          checks: [
            {
              kind: "expr",
              id: "total",
              label: "order_total() awaits the lines and prices and adds them up",
              show: "two lines: 2 × 7.49 and 1 × 31.0",
              expr: inLoop([
                "async def _lines(order_id):",
                "    await asyncio.sleep(0.1)",
                "    return [{'sku': 'A', 'qty': 2}, {'sku': 'B', 'qty': 1}]",
                "out = [await order_total('O1', _lines, _fetch), round(loop.time(), 2), sorted(_calls)]",
              ], fakeFetch({ A: 7.49, B: 31.0 }, { A: 0.05, B: 0.05 })),
              expected: py.list(py.float(45.98), py.float(0.2), strs("A", "B")),
            },
            {
              kind: "expr",
              id: "empty",
              label: "an order with no lines totals 0",
              hidden: true,
              expr: inLoop([
                "async def _lines(order_id):",
                "    await asyncio.sleep(0.1)",
                "    return []",
                "out = [await order_total('O2', _lines, _fetch), _calls]",
              ], fakeFetch({})),
              expected: py.list(py.int(0), py.list()),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "The first warehouse that has it",
        prompt: "Warehouses are checked in order of distance, and each check waits on that warehouse's system. Write `first_in_stock(sku, warehouses, check_stock)`: await `check_stock(warehouse, sku)` for each warehouse in order and return the first warehouse with stock above 0, **without checking the rest**; return `None` if none has it.",
        spec: [
          ["Coroutine", "`async def first_in_stock(sku, warehouses, check_stock)`"],
          ["Returns", "the first warehouse whose awaited stock is > 0, or `None`"],
          ["Rule", "stop at the first hit: later warehouses are not checked"],
        ],
        starter: src`
import asyncio
from browser_loop import run

async def first_in_stock(sku, warehouses, check_stock):
    return None

async def check_stock(warehouse, sku):
    await asyncio.sleep(0.2)
    return {"Houston": 0, "Denver": 3, "Seattle": 9}[warehouse]

print(run(first_in_stock("SPO-11681", ["Houston", "Denver", "Seattle"], check_stock)))
`,
        answer: src`
import asyncio
from browser_loop import run

async def first_in_stock(sku, warehouses, check_stock):
    for warehouse in warehouses:
        if await check_stock(warehouse, sku) > 0:
            return warehouse
    return None

async def check_stock(warehouse, sku):
    await asyncio.sleep(0.2)
    return {"Houston": 0, "Denver": 3, "Seattle": 9}[warehouse]

print(run(first_in_stock("SPO-11681", ["Houston", "Denver", "Seattle"], check_stock)))
`,
        alternatives: [
          src`
async def first_in_stock(sku, warehouses, check_stock):
    i = 0
    while i < len(warehouses):
        level = await check_stock(warehouses[i], sku)
        if level > 0:
            return warehouses[i]
        i += 1
    return None
`,
        ],
        wrong: [
          {
            code: src`
async def first_in_stock(sku, warehouses, check_stock):
    found = None
    for warehouse in warehouses:
        if await check_stock(warehouse, sku) > 0 and found is None:
            found = warehouse
    return found
`,
            fails: ["early"],
            why: "right answer, but every warehouse is checked, so the customer waits for all of them",
          },
          {
            code: src`
async def first_in_stock(sku, warehouses, check_stock):
    for warehouse in warehouses:
        if await check_stock(warehouse, sku) >= 0:
            return warehouse
    return None
`,
            fails: ["first", "early"],
            why: "a stock of 0 counts as available",
          },
        ],
        hints: [
          "Loop over the warehouses in order and await each check inside the loop.",
          "Return as soon as one has stock above 0: the remaining checks are never started.",
          "After the loop, nothing was found.",
        ],
        task: {
          files,
          checks: [
            {
              kind: "expr",
              id: "first",
              label: "first_in_stock() returns the first warehouse with stock",
              show: "Houston 0, Denver 3, Seattle 9",
              expr: inLoop([
                "async def _check(w, sku):",
                "    await asyncio.sleep(0.2)",
                "    return {'Houston': 0, 'Denver': 3, 'Seattle': 9, 'Reno': 0}[w]",
                "out = [await first_in_stock('S', ['Houston', 'Denver', 'Seattle'], _check), await first_in_stock('S', ['Houston', 'Reno'], _check), await first_in_stock('S', [], _check)]",
              ]),
              expected: py.list(py.str("Denver"), py.none, py.none),
            },
            {
              kind: "expr",
              id: "early",
              label: "later warehouses are not checked",
              hidden: true,
              expr: inLoop([
                "_asked = []",
                "async def _check(w, sku):",
                "    _asked.append(w)",
                "    await asyncio.sleep(0.2)",
                "    return {'A': 0, 'B': 5, 'C': 1}[w]",
                "_found = await first_in_stock('S', ['A', 'B', 'C'], _check)",
                "out = [_found, _asked, round(loop.time(), 2)]",
              ]),
              expected: py.list(py.str("B"), strs("A", "B"), py.float(0.4)),
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: LOOP_HEAD + src`
async def step(name, seconds):
    await asyncio.sleep(seconds)
    return name

async def main():
    loop = asyncio.get_running_loop()
    a = await step("parse", 0.4)
    b = await step("save", 0.1)
    print(a, b, round(loop.time(), 2))

run(main())
`,
        choices: ["parse save 0.5", "parse save 0.4", "save parse 0.5", "parse save 0.1"],
        answer: 0,
        why: "Each `await` finishes before the next line runs, so the waits add up to 0.5 s.",
      },
      {
        id: "q2",
        prompt: "A common mistake: what does this print?",
        program: LOOP_HEAD + src`
async def price(sku):
    await asyncio.sleep(0.1)
    return 7.49

async def main():
    p = price("SPO-11681")
    print(type(p).__name__)
    print(await p)

run(main())
`,
        choices: ["coroutine\n7.49", "float\n7.49", "7.49\n7.49", "coroutine\ncoroutine"],
        answer: 0,
        why: "Calling an async function gives a coroutine object; only `await` runs it and produces 7.49.",
      },
      {
        id: "q3",
        prompt: "Inside a coroutine, which call freezes every other coroutine on the loop?",
        choices: ["time.sleep(2)", "await asyncio.sleep(2)", "await other_coroutine()", "return 2"],
        answer: 0,
        why: "`time.sleep` blocks the whole thread, so the loop can't run anything else. `await asyncio.sleep` pauses only this coroutine.",
      },
    ],
    review: [
      "`async def` makes a coroutine function; calling it creates a coroutine; `await` runs it.",
      "Each `await` is a point where the coroutine may pause and let others run.",
      "`asyncio.run(main())` runs the event loop (`run(main())` here); awaits in sequence add their waits up.",
      "Next: tasks, which let independent awaits overlap.",
    ],
  },

  // ------------------------------------------------------------------ PY-L39-02 tasks
  {
    id: "PY-L39-02",
    version: 2,
    slug: "tasks-and-gather",
    title: "Tasks: running coroutines concurrently",
    lede: "A task schedules a coroutine to run while you do something else. Start several tasks and their waits overlap: three downloads take as long as the slowest, not the sum.",
    focus: "Run coroutines concurrently with create_task, gather and TaskGroup, and handle their errors.",
    minutes: 22,
    objectives: [
      "Start tasks with `asyncio.create_task` and wait for them with `await` or `asyncio.gather`",
      "Use `asyncio.TaskGroup` so that a failure cancels the group's other tasks",
      "Collect errors with `gather(..., return_exceptions=True)` instead of losing results",
    ],
    requires: ["arithmetic", "assignment", "async-await", "attr-assign", "boolean", "class-def", "comment", "comparison", "dict-comp", "dict-iterate", "dict-literal", "else-clause", "exc-name", "except-type", "finally-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "init-method", "list-index", "list-literal", "list-mutate", "membership", "method-def", "none-value", "part-attr", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "star-args", "string-index", "subclass", "super-call", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "type-call", "with-statement", "zip-call"],
    teaches: ["task-call"],
    blocks: [
      {
        kind: "text",
        md: "`await coro()` runs one coroutine to the end before continuing. To overlap independent work, wrap each coroutine in a **task**: `asyncio.create_task(coro())` schedules it on the loop right away and returns a Task you can await later. While one task waits, the loop runs the others. `await asyncio.gather(a, b, c)` waits for several coroutines or tasks and returns their results **in the order given**, whatever order they finished in.",
      },
      {
        kind: "example",
        title: "Three downloads at once",
        code: LOOP_HEAD + src`
async def download(name, seconds):
    await asyncio.sleep(seconds)
    return name

async def main():
    loop = asyncio.get_running_loop()
    tasks = [asyncio.create_task(download(n, s)) for n, s in [("orders.csv", 0.3), ("customers.csv", 0.1), ("products.csv", 0.2)]]
    print(await asyncio.gather(*tasks), round(loop.time(), 2))
    async with asyncio.TaskGroup() as group:
        a = group.create_task(download("reviews.csv", 0.25))
        b = group.create_task(download("sellers.csv", 0.05))
    print(a.result(), b.result(), round(loop.time(), 2))

run(main())
`,
        output: "['orders.csv', 'customers.csv', 'products.csv'] 0.3\nreviews.csv sellers.csv 0.55\n",
        note: "The three downloads overlapped: 0.3 s in total, the slowest, not 0.6. Results come back in the order the tasks were listed. A `TaskGroup` (Python 3.11+) waits for all its tasks when the `async with` block ends: 0.25 s more.",
      },
      {
        kind: "text",
        md: "Errors need a decision. By default `gather` raises the **first** exception and you lose the other results (those tasks keep running unless you cancel them). With `return_exceptions=True` it returns the exception objects in place of results, so you can report each failure. A `TaskGroup` takes the strict view: if one task fails, it cancels the rest and raises an `ExceptionGroup`.",
      },
      {
        kind: "example",
        title: "One export fails",
        code: LOOP_HEAD + src`
async def export(name):
    await asyncio.sleep(0.1)
    if name == "payments.csv":
        raise ConnectionError("reset by peer")
    return name

async def main():
    results = await asyncio.gather(export("orders.csv"), export("payments.csv"), return_exceptions=True)
    for r in results:
        print(type(r).__name__, r)
    try:
        await asyncio.gather(export("orders.csv"), export("payments.csv"))
    except ConnectionError as e:
        print("gather raised", e)

run(main())
`,
        output: "str orders.csv\nConnectionError reset by peer\ngather raised reset by peer\n",
        note: "With `return_exceptions=True` each slot holds a result or an exception, in order, so the report can name exactly what failed. Without it, the `ConnectionError` propagates and the successful result is lost to the caller.",
      },
      {
        kind: "text",
        md: "**When to use what:** `gather` for a known list of independent awaits; `TaskGroup` when the tasks belong together and one failure should stop the rest; `create_task` alone for background work you await later. Keep a reference to every task you create (the loop holds only a weak one, so an unreferenced task can disappear). **Mistakes to avoid:** awaiting each coroutine in a loop (serial again); creating tasks and never awaiting them (errors vanish); and expecting results in completion order from `gather` (they are in argument order).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Overlap the two loads",
      prompt: "`dashboard` awaits the sales and the stock loads one after the other: 0.5 s on the clock. They are independent; load them together with `asyncio.gather` and run it: the clock should show 0.3.",
      spec: [
        ["Coroutine", "`async def dashboard(load_sales, load_stock)`"],
        ["Returns", "`(sales, stock)` from the two awaited loads, after about the time of the slower one"],
      ],
      starter: src`
import asyncio
from browser_loop import run

async def dashboard(load_sales, load_stock):
    sales = await load_sales()
    stock = await load_stock()
    return sales, stock

async def load_sales():
    await asyncio.sleep(0.3)
    return 1520.75

async def load_stock():
    await asyncio.sleep(0.2)
    return {"SPO-11681": 4}

async def main():
    loop = asyncio.get_running_loop()
    print(await dashboard(load_sales, load_stock), round(loop.time(), 2))

run(main())
`,
      answer: src`
import asyncio
from browser_loop import run

async def dashboard(load_sales, load_stock):
    sales, stock = await asyncio.gather(load_sales(), load_stock())
    return sales, stock

async def load_sales():
    await asyncio.sleep(0.3)
    return 1520.75

async def load_stock():
    await asyncio.sleep(0.2)
    return {"SPO-11681": 4}

async def main():
    loop = asyncio.get_running_loop()
    print(await dashboard(load_sales, load_stock), round(loop.time(), 2))

run(main())
`,
      wrong: [
        {
          code: src`
import asyncio

async def dashboard(load_sales, load_stock):
    stock = await load_stock()
    sales = await load_sales()
    return sales, stock
`,
          fails: ["overlap"],
          why: "swapping the order still runs the loads one after the other",
        },
      ],
      hints: [
        "Both loads should be waiting at the same time.",
        "`asyncio.gather(a(), b())` runs both and returns their results in that order.",
        "Await the gather and unpack its two results.",
      ],
      task: {
        files,
        checks: [
          {
            kind: "expr",
            id: "overlap",
            label: "dashboard() returns both results after the slower load only",
            show: "sales 0.3 s, stock 0.2 s",
            expr: inLoop([
              "async def _sales():",
              "    await asyncio.sleep(0.3)",
              "    return 1520.75",
              "async def _stock():",
              "    await asyncio.sleep(0.2)",
              "    return {'A': 4}",
              "_r = await dashboard(_sales, _stock)",
              "out = [_r, round(loop.time(), 2)]",
            ]),
            expected: py.list(py.tuple(py.float(1520.75), py.dict([[py.str("A"), py.int(4)]])), py.float(0.3)),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Fetch every product page at once",
        prompt: "Write a coroutine `fetch_all(skus, fetch)` that fetches every SKU's page **concurrently** and returns a dictionary from SKU to result. Twenty pages that each take 0.2 s should take 0.2 s in total, not 4.",
        spec: [
          ["Coroutine", "`async def fetch_all(skus, fetch)`; `fetch(sku)` is a coroutine function"],
          ["Returns", "`{sku: await fetch(sku)}` for every SKU, each fetched once, all overlapping"],
        ],
        starter: src`
import asyncio
from browser_loop import run

async def fetch_all(skus, fetch):
    return {}

async def fetch(sku):
    await asyncio.sleep(0.2)
    return {"sku": sku, "in_stock": True}

print(run(fetch_all(["SPO-11681", "HOM-22847"], fetch)))
`,
        answer: src`
import asyncio
from browser_loop import run

async def fetch_all(skus, fetch):
    results = await asyncio.gather(*(fetch(sku) for sku in skus))
    return dict(zip(skus, results))

async def fetch(sku):
    await asyncio.sleep(0.2)
    return {"sku": sku, "in_stock": True}

print(run(fetch_all(["SPO-11681", "HOM-22847"], fetch)))
`,
        alternatives: [
          src`
import asyncio

async def fetch_all(skus, fetch):
    tasks = {}
    async with asyncio.TaskGroup() as group:
        for sku in skus:
            tasks[sku] = group.create_task(fetch(sku))
    return {sku: task.result() for sku, task in tasks.items()}
`,
        ],
        wrong: [
          {
            code: src`
async def fetch_all(skus, fetch):
    results = {}
    for sku in skus:
        results[sku] = await fetch(sku)
    return results
`,
            fails: ["overlap"],
            why: "awaiting each fetch in the loop runs them one after another",
          },
          {
            code: src`
import asyncio

async def fetch_all(skus, fetch):
    for sku in skus:
        asyncio.create_task(fetch(sku))
    await asyncio.sleep(0)
    return {}
`,
            fails: ["results", "overlap"],
            why: "the tasks are started but never awaited, so no results are collected",
          },
        ],
        hints: [
          "Create all the fetches first, without awaiting them one by one.",
          "`asyncio.gather(*coroutines)` runs them together and returns the results in the same order.",
          "Pair each SKU with its result (`zip`) to build the dictionary.",
        ],
        task: {
          files,
          checks: [
            {
              kind: "expr",
              id: "results",
              label: "fetch_all() returns every SKU's result",
              show: "fetch_all(['A', 'B', 'C'], fetch)",
              expr: inLoop(["out = await fetch_all(['A', 'B', 'C'], _fetch)"], fakeFetch({ A: 1, B: 2, C: 3 })),
              expected: py.dict([[py.str("A"), py.int(1)], [py.str("B"), py.int(2)], [py.str("C"), py.int(3)]]),
            },
            {
              kind: "expr",
              id: "overlap",
              label: "twenty 0.2 s fetches finish at 0.2 s, each fetched once",
              hidden: true,
              expr: inLoop([
                "_skus = [f'S{i}' for i in range(20)]",
                "_r = await fetch_all(_skus, _fetch)",
                "out = [len(_r), round(loop.time(), 2), len(_calls)]",
              ], fakeFetch(Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`S${i}`, i])), Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`S${i}`, 0.2])))),
              expected: py.list(py.int(20), py.float(0.2), py.int(20)),
            },
            {
              kind: "expr",
              id: "empty",
              label: "no SKUs",
              hidden: true,
              expr: inLoop(["out = await fetch_all([], _fetch)"], fakeFetch({})),
              expected: py.dict([]),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "A sync report that survives failures",
        prompt: "A nightly job syncs several stores concurrently and must report every outcome. Write `sync_report(stores, sync)`: run `sync(store)` for every store at once, and return `(synced, failed)`: a dictionary of results for stores that worked, and a dictionary from each failed store to the **name** of the exception it raised.",
        spec: [
          ["Coroutine", "`async def sync_report(stores, sync)`"],
          ["Returns", "`({store: result}, {store: \"ExceptionName\"})`"],
          ["Rule", "all syncs overlap; one failure doesn't lose the other results"],
        ],
        starter: src`
import asyncio
from browser_loop import run

async def sync_report(stores, sync):
    return {}, {}

async def sync(store):
    await asyncio.sleep(0.3)
    if store == "Denver":
        raise TimeoutError(store)
    return 120

print(run(sync_report(["Houston", "Denver"], sync)))
`,
        answer: src`
import asyncio
from browser_loop import run

async def sync_report(stores, sync):
    outcomes = await asyncio.gather(*(sync(store) for store in stores), return_exceptions=True)
    synced = {}
    failed = {}
    for store, outcome in zip(stores, outcomes):
        if isinstance(outcome, Exception):
            failed[store] = type(outcome).__name__
        else:
            synced[store] = outcome
    return synced, failed

async def sync(store):
    await asyncio.sleep(0.3)
    if store == "Denver":
        raise TimeoutError(store)
    return 120

print(run(sync_report(["Houston", "Denver"], sync)))
`,
        alternatives: [
          src`
import asyncio

async def sync_report(stores, sync):
    synced, failed = {}, {}

    async def one(store):
        try:
            synced[store] = await sync(store)
        except Exception as error:
            failed[store] = error.__class__.__name__

    await asyncio.gather(*(one(s) for s in stores))
    return synced, failed
`,
        ],
        wrong: [
          {
            code: src`
import asyncio

async def sync_report(stores, sync):
    outcomes = await asyncio.gather(*(sync(store) for store in stores))
    return dict(zip(stores, outcomes)), {}
`,
            fails: ["report", "overlap"],
            why: "without `return_exceptions=True` the first failure raises and every result is lost",
          },
          {
            code: src`
async def sync_report(stores, sync):
    synced, failed = {}, {}
    for store in stores:
        try:
            synced[store] = await sync(store)
        except Exception as error:
            failed[store] = type(error).__name__
    return synced, failed
`,
            fails: ["overlap"],
            why: "every outcome is reported, but the stores are synced one after another",
          },
        ],
        hints: [
          "Run all syncs with `asyncio.gather`, and ask it to return exceptions instead of raising them.",
          "Each slot of the result is either a value or an exception object, in the order of `stores`.",
          "`isinstance(outcome, Exception)` tells them apart; `type(outcome).__name__` names the error.",
        ],
        task: {
          files,
          checks: [
            {
              kind: "expr",
              id: "report",
              label: "sync_report() separates results from failures",
              show: "Houston works, Denver times out, Seattle raises KeyError",
              expr: inLoop([
                "async def _sync(store):",
                "    await asyncio.sleep(0.3)",
                "    if store == 'Denver':",
                "        raise TimeoutError(store)",
                "    if store == 'Seattle':",
                "        raise KeyError(store)",
                "    return len(store)",
                "out = await sync_report(['Houston', 'Denver', 'Seattle'], _sync)",
              ]),
              expected: py.tuple(py.dict([[py.str("Houston"), py.int(7)]]), py.dict([[py.str("Denver"), py.str("TimeoutError")], [py.str("Seattle"), py.str("KeyError")]])),
            },
            {
              kind: "expr",
              id: "overlap",
              label: "all syncs overlap",
              hidden: true,
              expr: inLoop([
                "async def _sync(store):",
                "    await asyncio.sleep(0.3)",
                "    if store == 'b':",
                "        raise ValueError(store)",
                "    return 1",
                "await sync_report(['a', 'b', 'c', 'd'], _sync)",
                "out = round(loop.time(), 2)",
              ]),
              expected: py.float(0.3),
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: LOOP_HEAD + src`
async def wait(name, seconds):
    await asyncio.sleep(seconds)
    return name

async def main():
    loop = asyncio.get_running_loop()
    names = await asyncio.gather(wait("slow", 0.5), wait("fast", 0.1))
    print(names, round(loop.time(), 2))

run(main())
`,
        choices: ["['slow', 'fast'] 0.5", "['fast', 'slow'] 0.5", "['slow', 'fast'] 0.6", "['fast', 'slow'] 0.1"],
        answer: 0,
        why: "The waits overlap, so the total is the slower one (0.5 s), and `gather` returns results in argument order, not finishing order.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `for url in urls: results.append(await fetch(url))` inside a coroutine. What happens with 50 URLs of 0.2 s each?",
        choices: ["It takes about 10 s: each await finishes before the next fetch starts", "It takes about 0.2 s", "It raises an error", "Only the first URL is fetched"],
        answer: 0,
        why: "Awaiting inside the loop is sequential. Create all fetches and `gather` them to overlap the waits.",
      },
      {
        id: "q3",
        prompt: "Three tasks belong to one checkout (reserve stock, charge card, create shipment). If any fails, the others should be cancelled. What fits best?",
        choices: ["asyncio.TaskGroup", "gather with return_exceptions=True", "create_task without awaiting", "await each one in turn"],
        answer: 0,
        why: "A TaskGroup cancels its remaining tasks when one fails and raises the error. `return_exceptions=True` is for reporting every outcome independently.",
      },
    ],
    review: [
      "`asyncio.create_task(coro())` schedules a coroutine; `gather` and `TaskGroup` wait for several.",
      "Independent waits overlap: total time ≈ the slowest, not the sum.",
      "`gather(..., return_exceptions=True)` keeps every outcome; a TaskGroup cancels the rest on failure.",
      "Next: stopping tasks deliberately, cancellation and timeouts.",
    ],
  },

  // ------------------------------------------------------------------ PY-L39-03 cancellation
  {
    id: "PY-L39-03",
    version: 2,
    slug: "cancellation-and-timeouts",
    title: "Cancellation and timeouts",
    lede: "A slow request shouldn't hang a program forever. Cancelling a task raises CancelledError inside it at its next await; timeouts cancel for you; finally blocks clean up either way.",
    focus: "Cancel tasks, put time limits on awaits, and clean up correctly when cancelled.",
    minutes: 22,
    objectives: [
      "Cancel a task with `task.cancel()` and explain where CancelledError appears",
      "Limit an await with `asyncio.timeout` or `asyncio.wait_for` and handle TimeoutError",
      "Release resources in `finally`, and never swallow CancelledError",
    ],
    requires: ["arithmetic", "assignment", "async-await", "attr-assign", "boolean", "class-def", "comment", "else-clause", "except-type", "finally-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "none-value", "print-call", "print-several", "print-text", "raise-stmt", "self-name", "set-comp", "set-literal", "star-args", "string-index", "subclass", "super-call", "task-call", "top-level-indent", "truthiness", "try-except", "tuple-unpack", "while-loop", "with-statement"],
    teaches: ["cancel-call"],
    blocks: [
      {
        kind: "text",
        md: "`task.cancel()` asks a task to stop: at the task's next `await`, asyncio raises **`asyncio.CancelledError`** inside it. The task can clean up (`finally`, or `except CancelledError:` followed by `raise`), and then it ends as *cancelled*. Awaiting a cancelled task raises CancelledError in the awaiting code too.",
      },
      {
        kind: "example",
        title: "Stopping a price feed",
        code: LOOP_HEAD + src`
async def stream_prices(log):
    try:
        while True:
            await asyncio.sleep(1)
            log.append("tick")
    except asyncio.CancelledError:
        log.append("cancelled")
        raise
    finally:
        log.append("closed feed")

async def main():
    loop = asyncio.get_running_loop()
    log = []
    task = asyncio.create_task(stream_prices(log))
    await asyncio.sleep(2.5)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    print(log, task.cancelled(), loop.time())

run(main())
`,
        output: "['tick', 'tick', 'cancelled', 'closed feed'] True 2.5\n",
        note: "The feed ticked at 1 s and 2 s; at 2.5 s the cancellation arrived inside `asyncio.sleep`. The `except` block logged it and re-raised, `finally` closed the feed, and the task ended cancelled.",
      },
      {
        kind: "text",
        md: "Usually you don't cancel by hand; you set a **time limit**. `async with asyncio.timeout(2):` (Python 3.11+) cancels whatever is awaited inside the block after 2 seconds and turns that into **`TimeoutError`** at the `async with`. `await asyncio.wait_for(coro, timeout=10)` does the same for one awaitable. And `asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)` returns as soon as one task is done, with the finished and still-pending tasks as two sets, so you can cancel the rest (with `timeout=` instead, it returns whatever finished in time).",
      },
      {
        kind: "example",
        title: "Giving up, and taking the first answer",
        code: LOOP_HEAD + src`
async def slow_report():
    await asyncio.sleep(5)
    return "report"

async def download(region, seconds):
    await asyncio.sleep(seconds)
    return region

async def main():
    loop = asyncio.get_running_loop()
    try:
        async with asyncio.timeout(2):
            await slow_report()
    except TimeoutError:
        print("gave up at", loop.time())
    print(await asyncio.wait_for(slow_report(), timeout=10), loop.time())
    tasks = {asyncio.create_task(download(r, s)) for r, s in [("eu", 0.4), ("us", 0.1), ("asia", 0.3)]}
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    print([t.result() for t in done], len(pending))
    for t in pending:
        t.cancel()

run(main())
`,
        output: "gave up at 2.0\nreport 7.0\n['us'] 2\n",
        note: "The timeout fired at exactly 2 s. `wait_for` with a 10 s limit let the 5 s report finish (2 + 5 = 7 on the clock). The fastest mirror answered first; the two pending downloads are cancelled so they don't keep running.",
      },
      {
        kind: "text",
        md: "**When to use it:** every network call needs a time limit; when the first of several answers is enough, cancel the rest; when the user closes a page, cancel the work it started. **Mistakes to avoid:** catching `CancelledError` and not re-raising it (the task looks finished but cancellation never worked); `except BaseException:` or a bare `except:` around awaits, which swallow it too; cleanup that isn't in `finally`; and forgetting to cancel tasks you no longer need.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Put a limit on the report",
      prompt: "`fetch_report` waits for the report however long it takes. Wrap the await in `async with asyncio.timeout(seconds):` and return `None` when it raises `TimeoutError`, then run it: the slow report should give up after 2 seconds.",
      spec: [
        ["Coroutine", "`async def fetch_report(load, seconds)`"],
        ["Returns", "`await load()` if it finishes within `seconds`, otherwise `None` (after exactly `seconds`)"],
      ],
      starter: src`
import asyncio
from browser_loop import run

async def fetch_report(load, seconds):
    return await load()

async def slow():
    await asyncio.sleep(5)
    return "monthly report"

async def main():
    loop = asyncio.get_running_loop()
    print(await fetch_report(slow, 2), loop.time())

run(main())
`,
      answer: src`
import asyncio
from browser_loop import run

async def fetch_report(load, seconds):
    try:
        async with asyncio.timeout(seconds):
            return await load()
    except TimeoutError:
        return None

async def slow():
    await asyncio.sleep(5)
    return "monthly report"

async def main():
    loop = asyncio.get_running_loop()
    print(await fetch_report(slow, 2), loop.time())

run(main())
`,
      wrong: [
        {
          code: src`
import asyncio

async def fetch_report(load, seconds):
    result = await load()
    await asyncio.sleep(0)
    return result
`,
          fails: ["limit"],
          why: "no time limit: the slow report is awaited to the end",
        },
      ],
      hints: [
        "`asyncio.timeout(seconds)` is an asynchronous context manager: `async with`.",
        "Put the `return await load()` inside its block.",
        "Surround the block with `try` and turn `TimeoutError` into `None`.",
      ],
      task: {
        files,
        checks: [
          {
            kind: "expr",
            id: "limit",
            label: "a slow load gives None after exactly the limit; a quick one returns its result",
            show: "fetch_report(slow 5 s, 2) then fetch_report(quick 1 s, 2)",
            expr: inLoop([
              "async def _slow():",
              "    await asyncio.sleep(5)",
              "    return 'slow'",
              "async def _quick():",
              "    await asyncio.sleep(1)",
              "    return 'quick'",
              "_a = await fetch_report(_slow, 2)",
              "_t = loop.time()",
              "_b = await fetch_report(_quick, 2)",
              "out = [_a, _t, _b, loop.time()]",
            ]),
            expected: py.list(py.none, py.float(2), py.str("quick"), py.float(3)),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Answers within a deadline",
        prompt: "A search page asks several backends at once and shows whatever has answered within `seconds`; slower ones are cancelled. Write `answers_within(sources, query, seconds)`: start `source(query)` for every source as a task, wait at most `seconds` for all of them, cancel the ones still running, and return the results of those that finished, in the order of `sources`.",
        spec: [
          ["Coroutine", "`async def answers_within(sources, query, seconds)`; each source is a coroutine function"],
          ["Returns", "a list of results of the sources that finished in time (and didn't raise), in source order"],
          ["Rule", "the coroutine returns after at most `seconds`; every unfinished task is cancelled"],
        ],
        starter: src`
import asyncio
from browser_loop import run

async def answers_within(sources, query, seconds):
    return []
`,
        answer: src`
import asyncio
from browser_loop import run

async def answers_within(sources, query, seconds):
    tasks = [asyncio.create_task(source(query)) for source in sources]
    if not tasks:
        return []
    done, pending = await asyncio.wait(tasks, timeout=seconds)
    for task in pending:
        task.cancel()
    results = []
    for task in tasks:
        if task in done and task.exception() is None:
            results.append(task.result())
    return results
`,
        alternatives: [
          src`
import asyncio

async def answers_within(sources, query, seconds):
    tasks = [asyncio.create_task(s(query)) for s in sources]
    try:
        async with asyncio.timeout(seconds):
            await asyncio.gather(*tasks, return_exceptions=True)
    except TimeoutError:
        pass
    found = []
    for t in tasks:
        if not t.done():
            t.cancel()
        elif not t.cancelled() and t.exception() is None:
            found.append(t.result())
    return found
`,
        ],
        wrong: [
          {
            code: src`
import asyncio

async def answers_within(sources, query, seconds):
    results = await asyncio.gather(*(source(query) for source in sources), return_exceptions=True)
    return [r for r in results if not isinstance(r, Exception)]
`,
            fails: ["deadline", "cancelled"],
            why: "no deadline: the page waits for the slowest backend",
          },
          {
            code: src`
import asyncio

async def answers_within(sources, query, seconds):
    tasks = [asyncio.create_task(source(query)) for source in sources]
    done, pending = await asyncio.wait(tasks, timeout=seconds)
    return [task.result() for task in tasks if task in done and task.exception() is None]
`,
            fails: ["cancelled"],
            why: "late tasks are left running in the background instead of being cancelled",
          },
        ],
        hints: [
          "Start every source as a task first.",
          "`asyncio.wait(tasks, timeout=seconds)` returns `(done, pending)` after at most that long.",
          "Cancel everything pending, then collect results of done tasks without an exception, in the original order.",
        ],
        task: {
          files,
          checks: [
            {
              kind: "expr",
              id: "deadline",
              label: "answers_within() returns the in-time answers after the deadline",
              show: "sources taking 0.1, 0.5 and 0.3 s, deadline 0.4",
              expr: inLoop([
                "def _source(name, seconds):",
                "    async def ask(q):",
                "        await asyncio.sleep(seconds)",
                "        return name + ':' + q",
                "    return ask",
                "_r = await answers_within([_source('a', 0.1), _source('b', 0.5), _source('c', 0.3)], 'tent', 0.4)",
                "out = [_r, round(loop.time(), 2)]",
              ]),
              expected: py.list(strs("a:tent", "c:tent"), py.float(0.4)),
            },
            {
              kind: "expr",
              id: "cancelled",
              label: "late sources are cancelled",
              hidden: true,
              expr: inLoop([
                "_log = []",
                "async def _late(q):",
                "    try:",
                "        await asyncio.sleep(9)",
                "    finally:",
                "        _log.append('cleaned up')",
                "async def _quick(q):",
                "    await asyncio.sleep(0.1)",
                "    return 'quick'",
                "_r = await answers_within([_late, _quick], 'x', 1)",
                "await asyncio.sleep(0)",
                "out = [_r, list(_log), round(loop.time(), 2)]",
              ]),
              expected: py.list(strs("quick"), strs("cleaned up"), py.float(1)),
            },
            {
              kind: "expr",
              id: "errors",
              label: "a source that fails is left out",
              hidden: true,
              expr: inLoop([
                "async def _bad(q):",
                "    await asyncio.sleep(0.1)",
                "    raise ConnectionError(q)",
                "async def _good(q):",
                "    await asyncio.sleep(0.2)",
                "    return 'ok'",
                "out = await answers_within([_bad, _good], 'x', 1)",
              ]),
              expected: strs("ok"),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Return a connection even when cancelled",
        prompt: "A database pool has a fixed number of connections. Write `run_query(pool, sql, execute)`: take a connection with `await pool.acquire()`, await `execute(connection, sql)`, and **always** give the connection back with `pool.release(connection)`, also when the query fails or the task is cancelled. Return the query's result.",
        spec: [
          ["Coroutine", "`async def run_query(pool, sql, execute)`"],
          ["pool", "has `async acquire()` returning a connection, and `release(connection)`"],
          ["Rule", "the connection is released after success, after an exception (which still propagates), and after cancellation"],
        ],
        starter: src`
import asyncio
from browser_loop import run

async def run_query(pool, sql, execute):
    connection = await pool.acquire()
    result = await execute(connection, sql)
    pool.release(connection)
    return result
`,
        answer: src`
import asyncio
from browser_loop import run

async def run_query(pool, sql, execute):
    connection = await pool.acquire()
    try:
        return await execute(connection, sql)
    finally:
        pool.release(connection)
`,
        alternatives: [
          src`
import asyncio

async def run_query(pool, sql, execute):
    conn = await pool.acquire()
    try:
        result = await execute(conn, sql)
    except BaseException:
        pool.release(conn)
        raise
    pool.release(conn)
    return result
`,
        ],
        wrong: [
          {
            code: src`
import asyncio

async def run_query(pool, sql, execute):
    connection = await pool.acquire()
    try:
        return await execute(connection, sql)
    except Exception:
        pool.release(connection)
        raise
`,
            fails: ["success", "cancelled"],
            why: "the connection is only returned after an ordinary exception: success and cancellation leak it",
          },
          {
            code: src`
import asyncio

async def run_query(pool, sql, execute):
    connection = await pool.acquire()
    try:
        result = await execute(connection, sql)
    except asyncio.CancelledError:
        result = None
    pool.release(connection)
    return result
`,
            fails: ["cancelled", "error"],
            why: "it swallows the cancellation (the task never ends as cancelled) and leaks the connection on errors",
          },
        ],
        hints: [
          "Cleanup that must happen whatever goes wrong belongs in `finally`.",
          "Cancellation arrives as CancelledError at the await inside `execute`; `finally` runs for it too.",
          "Acquire first, then `try: return await ...` with the release in `finally`.",
        ],
        task: {
          files,
          checks: [
            {
              kind: "expr",
              id: "success",
              label: "a successful query returns its result and the connection",
              show: "run_query(pool, 'SELECT 1', execute)",
              expr: inLoop([
                "class _Pool:",
                "    def __init__(self):",
                "        self.free = ['c1']",
                "    async def acquire(self):",
                "        await asyncio.sleep(0.01)",
                "        return self.free.pop()",
                "    def release(self, c):",
                "        self.free.append(c)",
                "async def _run_sql(c, sql):",
                "    await asyncio.sleep(0.1)",
                "    return [(1,)]",
                "_p = _Pool()",
                "out = [await run_query(_p, 'SELECT 1', _run_sql), _p.free]",
              ]),
              expected: py.list(py.list(py.tuple(py.int(1))), strs("c1")),
            },
            {
              kind: "expr",
              id: "error",
              label: "a failing query re-raises and returns the connection",
              hidden: true,
              expr: inLoop([
                "class _Pool:",
                "    def __init__(self):",
                "        self.free = ['c1']",
                "    async def acquire(self):",
                "        return self.free.pop()",
                "    def release(self, c):",
                "        self.free.append(c)",
                "async def _run_sql(c, sql):",
                "    await asyncio.sleep(0.1)",
                "    raise ValueError('syntax error')",
                "_p = _Pool()",
                "try:",
                "    await run_query(_p, 'SELEC', _run_sql)",
                "    _raised = 'nothing'",
                "except ValueError:",
                "    _raised = 'ValueError'",
                "out = [_raised, _p.free]",
              ]),
              expected: py.list(py.str("ValueError"), strs("c1")),
            },
            {
              kind: "expr",
              id: "cancelled",
              label: "a cancelled query ends cancelled and returns the connection",
              hidden: true,
              expr: inLoop([
                "class _Pool:",
                "    def __init__(self):",
                "        self.free = ['c1']",
                "    async def acquire(self):",
                "        return self.free.pop()",
                "    def release(self, c):",
                "        self.free.append(c)",
                "async def _run_sql(c, sql):",
                "    await asyncio.sleep(10)",
                "_p = _Pool()",
                "_t = asyncio.create_task(run_query(_p, 'SELECT * FROM orders', _run_sql))",
                "await asyncio.sleep(1)",
                "_t.cancel()",
                "try:",
                "    await _t",
                "except asyncio.CancelledError:",
                "    pass",
                "out = [_t.cancelled(), _p.free]",
              ]),
              expected: py.list(yes, strs("c1")),
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: LOOP_HEAD + src`
async def upload(log):
    try:
        await asyncio.sleep(3)
        log.append("uploaded")
    finally:
        log.append("cleanup")

async def main():
    loop = asyncio.get_running_loop()
    log = []
    try:
        await asyncio.wait_for(upload(log), timeout=1)
    except TimeoutError:
        log.append("timeout")
    print(log, loop.time())

run(main())
`,
        choices: ["['cleanup', 'timeout'] 1.0", "['uploaded', 'cleanup'] 3.0", "['timeout'] 1.0", "['timeout', 'cleanup'] 1.0"],
        answer: 0,
        why: "At 1 s `wait_for` cancels the upload: its `finally` runs first, then the caller sees TimeoutError.",
      },
      {
        id: "q2",
        prompt: "A common mistake: what does this print?",
        program: LOOP_HEAD + src`
async def worker():
    try:
        await asyncio.sleep(10)
    except asyncio.CancelledError:
        return "ignored"

async def main():
    task = asyncio.create_task(worker())
    await asyncio.sleep(1)
    task.cancel()
    print(await task, task.cancelled())

run(main())
`,
        choices: ["ignored False", "ignored True", "None True", "CancelledError"],
        answer: 0,
        why: "The worker caught CancelledError and returned normally, so the task wasn't cancelled at all. Clean up, then re-raise.",
      },
      {
        id: "q3",
        prompt: "Which is the right way to put a 5-second limit on a group of awaits in Python 3.11+?",
        choices: ["async with asyncio.timeout(5):", "time.sleep(5)", "with asyncio.timeout(5):", "await asyncio.sleep(5) then cancel"],
        answer: 0,
        why: "`asyncio.timeout` is an asynchronous context manager, used with `async with`; it cancels the block's work at the limit and raises TimeoutError.",
      },
    ],
    review: [
      "`task.cancel()` raises CancelledError inside the task at its next await; awaiting it raises it again.",
      "`asyncio.timeout(s)` and `wait_for(..., timeout=s)` cancel slow work and raise TimeoutError; `asyncio.wait` can stop at the first result or a deadline.",
      "Clean up in `finally`; never swallow CancelledError.",
      "Next: limiting how many tasks run at once, with semaphores.",
    ],
  },

  // ------------------------------------------------------------------ PY-L39-04 semaphores
  {
    id: "PY-L39-04",
    version: 2,
    slug: "semaphores-limit-concurrency",
    title: "Semaphores: limiting how much runs at once",
    lede: "Starting a thousand requests at once overloads servers and gets you rate-limited. A semaphore lets at most n tasks into a block at a time; the rest wait their turn.",
    focus: "Limit concurrency with asyncio.Semaphore and reason about the resulting timing.",
    minutes: 20,
    objectives: [
      "Use `asyncio.Semaphore(n)` with `async with` to cap concurrent work",
      "Predict total time from the number of jobs, the limit and each job's duration",
      "Give different resources their own limits",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "async-await", "attr-assign", "class-def", "comment", "defaultdict-call", "dict-literal", "dict-lookup", "finally-clause", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-module", "init-method", "lambda", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "logical", "membership", "method-def", "none-value", "print-call", "print-several", "print-text", "range-call", "self-name", "string-format", "string-index", "string-split", "subclass", "super-call", "task-call", "top-level-indent", "try-except", "with-statement"],
    teaches: ["sem-gate"],
    blocks: [
      {
        kind: "text",
        md: "A **semaphore** holds a number of permits. `async with sem:` takes one (waiting if none are free) and gives it back when the block ends, even after an error. `asyncio.Semaphore(2)` therefore lets at most two tasks inside the block at once. Wrap only the part that needs limiting (the request itself), so waiting tasks don't hold permits.",
      },
      {
        kind: "example",
        title: "Five pages, two at a time",
        code: LOOP_HEAD + src`
async def main():
    loop = asyncio.get_running_loop()
    limit = asyncio.Semaphore(2)
    active = {"now": 0, "most": 0}

    async def fetch(page):
        async with limit:
            active["now"] += 1
            active["most"] = max(active["most"], active["now"])
            await asyncio.sleep(0.5)
            active["now"] -= 1
            return page

    pages = await asyncio.gather(*(fetch(p) for p in range(1, 6)))
    print(pages, active["most"], loop.time())

run(main())
`,
        output: "[1, 2, 3, 4, 5] 2 1.5\n",
        note: "Never more than two fetches were inside the block. Five jobs of 0.5 s, two at a time, take three rounds: 1.5 s. Without the semaphore they would all overlap (0.5 s) and hit the server five at once.",
      },
      {
        kind: "text",
        md: "The timing rule: with `n` jobs of equal length `t` and a limit of `k`, the total is about `ceil(n / k) × t`. Raising the limit helps until the server (or rate limit) becomes the bottleneck. Different resources often need different limits, such as 4 requests per API host but 2 database writes: give each its own semaphore.",
      },
      {
        kind: "example",
        title: "One limit per host",
        code: LOOP_HEAD + src`
async def main():
    loop = asyncio.get_running_loop()
    limits = {"api.runtime.market": asyncio.Semaphore(3), "images.runtime.market": asyncio.Semaphore(1)}

    async def get(host, path):
        async with limits[host]:
            await asyncio.sleep(0.2)
            return host.split(".")[0] + path

    jobs = [("api.runtime.market", f"/orders/{n}") for n in range(3)] + [("images.runtime.market", f"/p/{n}.jpg") for n in range(3)]
    results = await asyncio.gather(*(get(h, p) for h, p in jobs))
    print(len(results), results[0], results[-1], round(loop.time(), 2))

run(main())
`,
        output: "6 api/orders/0 images/p/2.jpg 0.6\n",
        note: "The three API calls ran together (0.2 s), while the image host, limited to one, served its three one after another (0.6 s). The total is set by the most constrained host.",
      },
      {
        kind: "text",
        md: "**When to use it:** any time you fan out to an external service: APIs with rate limits, databases with connection limits, file systems. **Mistakes to avoid:** creating the semaphore inside each task (each gets its own, so nothing is limited); holding the permit while doing unrelated slow work; and confusing a limit on concurrency with a limit on rate (requests per second needs pacing too).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Share one semaphore",
      prompt: "`fetch_pages` creates a new `Semaphore(2)` inside every fetch, so each task has its own permits and nothing is limited. Create one semaphore before the tasks start and use it in every fetch, then run it: the clock should show 1.5, not 0.5.",
      spec: [
        ["Coroutine", "`async def fetch_pages(pages, fetch)`"],
        ["Rule", "at most 2 fetches at once"],
        ["Returns", "the fetched results in page order"],
      ],
      starter: src`
import asyncio
from browser_loop import run

async def fetch_pages(pages, fetch):
    async def limited(page):
        async with asyncio.Semaphore(2):
            return await fetch(page)
    return await asyncio.gather(*(limited(p) for p in pages))

async def fetch(page):
    await asyncio.sleep(0.5)
    return f"page {page}"

async def main():
    loop = asyncio.get_running_loop()
    print(await fetch_pages([1, 2, 3, 4, 5], fetch), loop.time())

run(main())
`,
      answer: src`
import asyncio
from browser_loop import run

async def fetch_pages(pages, fetch):
    limit = asyncio.Semaphore(2)

    async def limited(page):
        async with limit:
            return await fetch(page)
    return await asyncio.gather(*(limited(p) for p in pages))

async def fetch(page):
    await asyncio.sleep(0.5)
    return f"page {page}"

async def main():
    loop = asyncio.get_running_loop()
    print(await fetch_pages([1, 2, 3, 4, 5], fetch), loop.time())

run(main())
`,
      wrong: [
        {
          code: src`
import asyncio

async def fetch_pages(pages, fetch):
    results = []
    for page in pages:
        results.append(await fetch(page))
    return results
`,
          fails: ["limit"],
          why: "one at a time is within the limit, but slower than necessary",
        },
      ],
      hints: [
        "A semaphore only limits the tasks that share it.",
        "Create it once, before the tasks.",
        "Use that one object in every `async with`.",
      ],
      task: {
        files,
        checks: [
          {
            kind: "expr",
            id: "limit",
            label: "five 0.5 s pages, two at a time, finish at 1.5 s",
            show: "fetch_pages([1, 2, 3, 4, 5], fetch)",
            expr: inLoop([
              "_act = [0, 0]",
              "async def _f(p):",
              "    _act[0] += 1",
              "    _act[1] = max(_act[1], _act[0])",
              "    await asyncio.sleep(0.5)",
              "    _act[0] -= 1",
              "    return p * 10",
              "_r = await fetch_pages([1, 2, 3, 4, 5], _f)",
              "out = [_r, _act[1], loop.time()]",
            ]),
            expected: py.list(py.list(py.int(10), py.int(20), py.int(30), py.int(40), py.int(50)), py.int(2), py.float(1.5)),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Fetch with a configurable limit",
        prompt: "Write `fetch_limited(items, fetch, limit)`: fetch every item concurrently but with at most `limit` fetches in flight at any moment, and return the results in item order.",
        spec: [
          ["Coroutine", "`async def fetch_limited(items, fetch, limit)`"],
          ["Returns", "`[await fetch(item) for each item]`, in order"],
          ["Rule", "never more than `limit` fetches at once; otherwise as many as possible (a new fetch starts as soon as one finishes)"],
        ],
        starter: src`
import asyncio
from browser_loop import run

async def fetch_limited(items, fetch, limit):
    return []
`,
        answer: src`
import asyncio
from browser_loop import run

async def fetch_limited(items, fetch, limit):
    gate = asyncio.Semaphore(limit)

    async def one(item):
        async with gate:
            return await fetch(item)

    return await asyncio.gather(*(one(item) for item in items))
`,
        alternatives: [
          src`
import asyncio

async def fetch_limited(items, fetch, limit):
    sem = asyncio.Semaphore(limit)
    results = [None] * len(items)

    async def worker(i):
        async with sem:
            results[i] = await fetch(items[i])

    async with asyncio.TaskGroup() as group:
        for i in range(len(items)):
            group.create_task(worker(i))
    return results
`,
        ],
        wrong: [
          {
            code: src`
import asyncio

async def fetch_limited(items, fetch, limit):
    return await asyncio.gather(*(fetch(item) for item in items))
`,
            fails: ["limit"],
            why: "no limit: every fetch starts at once",
          },
          {
            code: src`
import asyncio

async def fetch_limited(items, fetch, limit):
    results = []
    for start in range(0, len(items), limit):
        batch = items[start:start + limit]
        results += await asyncio.gather(*(fetch(i) for i in batch))
    return results
`,
            fails: ["timing"],
            why: "fixed batches wait for their slowest item before the next batch starts, leaving permits unused",
          },
        ],
        hints: [
          "One semaphore with `limit` permits, created before the fetches start.",
          "Wrap each fetch in `async with` on that semaphore, inside a small helper coroutine.",
          "`gather` the helpers so all items are queued and results come back in order.",
        ],
        task: {
          files,
          checks: [
            {
              kind: "expr",
              id: "limit",
              label: "at most `limit` fetches run at once, results in order",
              show: "7 items, limit 3",
              expr: inLoop([
                "_act = [0, 0]",
                "async def _f(x):",
                "    _act[0] += 1",
                "    _act[1] = max(_act[1], _act[0])",
                "    await asyncio.sleep(0.2)",
                "    _act[0] -= 1",
                "    return x.upper()",
                "_r = await fetch_limited(list('abcdefg'), _f, 3)",
                "out = [_r, _act[1]]",
              ]),
              expected: py.list(strs("A", "B", "C", "D", "E", "F", "G"), py.int(3)),
            },
            {
              kind: "expr",
              id: "timing",
              label: "uneven jobs still use every permit",
              hidden: true,
              expr: inLoop([
                "async def _f(s):",
                "    await asyncio.sleep(s)",
                "    return s",
                "await fetch_limited([0.4, 0.1, 0.1, 0.1, 0.1], _f, 2)",
                "out = round(loop.time(), 2)",
              ]),
              expected: py.float(0.4),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Per-host limits for a crawler",
        prompt: "A link checker visits URLs on several hosts; each host allows only `per_host` requests at once, but different hosts can be visited in parallel. Write `check_links(urls, fetch, per_host)`: one semaphore per host (the part between `//` and the next `/`), every URL checked concurrently within those limits; return the results in URL order.",
        spec: [
          ["Coroutine", "`async def check_links(urls, fetch, per_host)`"],
          ["Host", "`\"https://api.runtime.market/orders/1\"` → `\"api.runtime.market\"`"],
          ["Returns", "`[await fetch(url) …]` in URL order; at most `per_host` fetches per host at once"],
        ],
        starter: src`
import asyncio
from browser_loop import run

async def check_links(urls, fetch, per_host):
    return []
`,
        answer: src`
import asyncio
from browser_loop import run

async def check_links(urls, fetch, per_host):
    limits = {}
    for url in urls:
        host = url.split("/")[2]
        if host not in limits:
            limits[host] = asyncio.Semaphore(per_host)

    async def check(url):
        async with limits[url.split("/")[2]]:
            return await fetch(url)

    return await asyncio.gather(*(check(url) for url in urls))
`,
        alternatives: [
          src`
import asyncio
from collections import defaultdict

async def check_links(urls, fetch, per_host):
    gates = defaultdict(lambda: asyncio.Semaphore(per_host))

    async def one(url):
        host = url.split("//", 1)[1].split("/", 1)[0]
        async with gates[host]:
            return await fetch(url)

    return list(await asyncio.gather(*(one(u) for u in urls)))
`,
        ],
        wrong: [
          {
            code: src`
import asyncio

async def check_links(urls, fetch, per_host):
    gate = asyncio.Semaphore(per_host)

    async def check(url):
        async with gate:
            return await fetch(url)

    return await asyncio.gather(*(check(url) for url in urls))
`,
            fails: ["hosts", "per-host"],
            why: "one semaphore for everything: a slow host's limit also blocks every other host",
          },
          {
            code: src`
import asyncio

async def check_links(urls, fetch, per_host):
    async def check(url):
        async with asyncio.Semaphore(per_host):
            return await fetch(url)

    return await asyncio.gather(*(check(url) for url in urls))
`,
            fails: ["hosts", "per-host"],
            why: "a new semaphore per request limits nothing",
          },
        ],
        hints: [
          "Build a dictionary from host to its own semaphore before starting any check.",
          "`url.split(\"/\")[2]` is the host part of `https://host/path`.",
          "Each check enters its host's semaphore around the fetch; `gather` all checks.",
        ],
        task: {
          files,
          checks: [
            {
              kind: "expr",
              id: "hosts",
              label: "different hosts are checked in parallel, each host one at a time",
              show: "2 URLs on each of 2 hosts, per_host=1",
              expr: inLoop([
                "async def _f(u):",
                "    await asyncio.sleep(0.3)",
                "    return u[-1]",
                "_r = await check_links(['https://a.example/1', 'https://b.example/2', 'https://a.example/3', 'https://b.example/4'], _f, 1)",
                "out = [_r, round(loop.time(), 2)]",
              ]),
              expected: py.list(strs("1", "2", "3", "4"), py.float(0.6)),
            },
            {
              kind: "expr",
              id: "per-host",
              label: "no host gets more than per_host requests at once",
              hidden: true,
              expr: inLoop([
                "_now = {}",
                "_most = {}",
                "async def _f(u):",
                "    h = u.split('/')[2]",
                "    _now[h] = _now.get(h, 0) + 1",
                "    _most[h] = max(_most.get(h, 0), _now[h])",
                "    await asyncio.sleep(0.1)",
                "    _now[h] -= 1",
                "    return h",
                "_urls = [f'https://h{i % 2}.example/{i}' for i in range(10)]",
                "await check_links(_urls, _f, 2)",
                "out = [_most, round(loop.time(), 2)]",
              ]),
              expected: py.list(py.dict([[py.str("h0.example"), py.int(2)], [py.str("h1.example"), py.int(2)]]), py.float(0.3)),
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: LOOP_HEAD + src`
async def main():
    loop = asyncio.get_running_loop()
    gate = asyncio.Semaphore(3)

    async def job(n):
        async with gate:
            await asyncio.sleep(1)
            return n

    await asyncio.gather(*(job(n) for n in range(7)))
    print(loop.time())

run(main())
`,
        choices: ["3.0", "7.0", "1.0", "2.0"],
        answer: 0,
        why: "Seven one-second jobs, three at a time: rounds of 3, 3 and 1, so 3 seconds.",
      },
      {
        id: "q2",
        prompt: "A common mistake: `async with asyncio.Semaphore(5):` written inside the coroutine that each task runs. How many requests can run at once?",
        choices: ["All of them: each task gets its own semaphore", "5", "1", "None: it deadlocks"],
        answer: 0,
        why: "A semaphore only coordinates the tasks that share the same object. Create it once and pass it (or close over it).",
      },
      {
        id: "q3",
        prompt: "An API allows 10 concurrent connections. You have 1,000 URLs. What should the program do?",
        choices: [
          "Create all 1,000 tasks, each entering one shared Semaphore(10) around its request",
          "Start all 1,000 requests at once",
          "Fetch the URLs one at a time",
          "Create 10 semaphores of 1 each",
        ],
        answer: 0,
        why: "Tasks are cheap; the shared semaphore keeps exactly 10 requests in flight and starts the next as soon as one finishes.",
      },
    ],
    review: [
      "`asyncio.Semaphore(n)` + `async with` lets at most n tasks into a block at once.",
      "Total time ≈ ceil(jobs ÷ limit) × job time; the most constrained resource sets the pace.",
      "Share one semaphore per resource; separate resources get separate semaphores.",
      "Next: putting it together in an async request workflow.",
    ],
  },

  // ------------------------------------------------------------------ PY-L39-05 async HTTP workflows
  {
    id: "PY-L39-05",
    version: 2,
    slug: "async-request-workflow",
    title: "Async HTTP workflows: limits, timeouts and retries",
    lede: "A real client combines everything: many requests at once under a limit, a timeout on each, retries for temporary failures, and a report that keeps every result. The asyncio parts are the same whatever HTTP library you use.",
    focus: "Build an async request workflow with a concurrency limit, per-request timeouts and limited retries.",
    minutes: 26,
    objectives: [
      "Await an async HTTP client's response, check its status and parse JSON",
      "Retry only temporary failures (timeouts, 5xx), a limited number of times, waiting longer each time",
      "Fetch many URLs under a semaphore and report failures without losing results",
    ],
    requires: ["arithmetic", "assignment", "async-await", "attr-assign", "boolean", "break-statement", "cancel-call", "class-def", "comment", "comp-if", "comparison", "dict-comp", "dict-get", "dict-literal", "dict-lookup", "else-clause", "except-type", "finally-clause", "for-loop", "function-def", "function-param", "function-return", "identity", "if-statement", "import-module", "init-method", "json-dumps", "json-loads", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "method-def", "nested-condition", "nested-dict", "none-value", "plain-class", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "reassignment", "self-name", "sem-gate", "string-format", "string-index", "subclass", "super-call", "task-call", "top-level-indent", "try-except", "tuple-unpack", "unicode-text", "with-statement", "zip-call"],
    teaches: ["async-fetch"],
    blocks: [
      {
        kind: "text",
        md: "On a computer, async HTTP comes from a library such as `httpx` or `aiohttp`: `response = await client.get(url)`, then the status and `response.json()`. There is no network in this page, so the lesson uses a small stand-in, `SavedTransport` (in `saved_http.py` for the exercises): `await transport.get(url)` waits for the latency given with a saved answer, on the event loop's clock, and returns a response with `status` and `json()`. The answers are trimmed copies of real USGS earthquake API data. Everything above the transport is the asyncio you have learned.",
      },
      {
        kind: "example",
        title: "Three days of earthquakes, fetched together",
        code: LOOP_HEAD + src`
import json

class Response:
    def __init__(self, status, body):
        self.status = status
        self.text = json.dumps(body)

    def json(self):
        return json.loads(self.text)

class SavedTransport:
    def __init__(self, saved):
        self.saved = saved

    async def get(self, url):
        status, body, seconds = self.saved[url]
        await asyncio.sleep(seconds)
        return Response(status, body)

API = "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=4&date="
saved = {
    API + "2025-03-01": (200, {"features": [{"properties": {"mag": 4.7, "place": "Arctic Ocean"}}, {"properties": {"mag": 4.0, "place": "31 km ENE of Firá, Greece"}}]}, 0.4),
    API + "2025-03-02": (503, {"error": "Service Unavailable"}, 0.1),
    API + "2025-03-03": (200, {"features": [{"properties": {"mag": 4.3, "place": "126 km NE of Tobelo, Indonesia"}}]}, 0.3),
}

async def quakes_on(transport, day):
    response = await transport.get(API + day)
    if response.status != 200:
        raise RuntimeError(f"HTTP {response.status} for {day}")
    return [f["properties"]["place"] for f in response.json()["features"]]

async def main():
    loop = asyncio.get_running_loop()
    transport = SavedTransport(saved)
    days = ["2025-03-01", "2025-03-02", "2025-03-03"]
    results = await asyncio.gather(*(quakes_on(transport, d) for d in days), return_exceptions=True)
    for day, result in zip(days, results):
        print(day, result)
    print(loop.time())

run(main())
`,
        output: "2025-03-01 ['Arctic Ocean', '31 km ENE of Firá, Greece']\n2025-03-02 HTTP 503 for 2025-03-02\n2025-03-03 ['126 km NE of Tobelo, Indonesia']\n0.4\n",
        note: "The three requests overlapped (0.4 s, the slowest). Checking the status before parsing turns a 503 into a clear error, and `return_exceptions=True` keeps the two good days. (A 503 is temporary: the next example retries it.)",
      },
      {
        kind: "text",
        md: "**Retry only what can succeed later.** Timeouts, 429 *Too Many Requests* and 5xx server errors are often temporary; 404 or 400 will fail the same way every time. Retry a limited number of times and wait longer between attempts (**exponential backoff**: 0.5 s, 1 s, 2 s…), so a struggling server gets room to recover. Each attempt also gets its own timeout.",
      },
      {
        kind: "example",
        title: "Retry with backoff and a timeout per attempt",
        code: LOOP_HEAD + src`
async def get_with_retries(get, url, attempts, timeout, backoff):
    for attempt in range(attempts):
        try:
            async with asyncio.timeout(timeout):
                status, body = await get(url)
            if status < 500:
                return status, body
        except TimeoutError:
            pass
        if attempt < attempts - 1:
            await asyncio.sleep(backoff * 2 ** attempt)
    raise RuntimeError(f"gave up on {url} after {attempts} attempts")

answers = [("hang", None), (503, None), (200, {"count": 466})]

async def flaky_get(url):
    kind, body = answers.pop(0)
    if kind == "hang":
        await asyncio.sleep(60)
    await asyncio.sleep(0.1)
    return kind, body

async def main():
    loop = asyncio.get_running_loop()
    print(await get_with_retries(flaky_get, "/count", attempts=3, timeout=1, backoff=0.5), loop.time())

run(main())
`,
        output: "(200, {'count': 466}) 2.7\n",
        note: "Attempt 1 hung and was cut off at 1 s; wait 0.5 s; attempt 2 got a 503 after 0.1 s; wait 1 s; attempt 3 succeeded after 0.1 s. Total 1 + 0.5 + 0.1 + 1 + 0.1 = 2.7 s. A 404 would be returned at once, not retried.",
      },
      {
        kind: "text",
        md: "**Putting it together:** a semaphore bounds how many requests are in flight, each request has a timeout and a small retry budget, and the caller gathers outcomes without letting one failure discard the rest. **Mistakes to avoid:** retrying 4xx errors (they won't change); retrying forever or without backoff (a retry storm); a single timeout around the whole batch when you meant one per request; and creating a new client per request on a real HTTP library (reuse one, it keeps connections open).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Check the status before parsing",
      prompt: "`count_quakes` parses every response, so an error page (`{\"error\": ...}`) crashes with KeyError. Make it call `response.raise_for_status()` before reading the body, so a failed request raises `HTTPStatusError` with the status, and run it.",
      spec: [
        ["Coroutine", "`async def count_quakes(transport, url)`"],
        ["Returns", "the number of features in a 200 response; raises `HTTPStatusError` (from `saved_http`) for a 4xx/5xx"],
      ],
      starter: src`
import asyncio
from browser_loop import run
from saved_http import SavedTransport

async def count_quakes(transport, url):
    response = await transport.get(url)
    return len(response.json()["features"])

transport = SavedTransport({"/day": {"status": 200, "body": {"features": [{}, {}]}, "seconds": 0.2}})
print(run(count_quakes(transport, "/day")))
`,
      answer: src`
import asyncio
from browser_loop import run
from saved_http import SavedTransport

async def count_quakes(transport, url):
    response = await transport.get(url)
    response.raise_for_status()
    return len(response.json()["features"])

transport = SavedTransport({"/day": {"status": 200, "body": {"features": [{}, {}]}, "seconds": 0.2}})
print(run(count_quakes(transport, "/day")))
`,
      wrong: [
        {
          code: src`
async def count_quakes(transport, url):
    response = await transport.get(url)
    return len(response.json().get("features", []))
`,
          fails: ["errors"],
          why: "an error page is counted as zero earthquakes instead of failing",
        },
      ],
      hints: [
        "The response knows its status; check it before trusting the body.",
        "`raise_for_status()` raises for 4xx and 5xx and does nothing for 200.",
        "Call it on the line before parsing.",
      ],
      task: {
        files,
        checks: [
          {
            kind: "expr",
            id: "count",
            label: "count_quakes() counts the features of a good response",
            show: "a 200 response with 3 features",
            expr: inLoop(["out = await count_quakes(SavedTransport({'/d': {'status': 200, 'body': {'features': [{}, {}, {}]}, 'seconds': 0.1}}), '/d')"], "from saved_http import SavedTransport"),
            expected: py.int(3),
          },
          {
            kind: "expr",
            id: "errors",
            label: "an error status raises HTTPStatusError",
            hidden: true,
            expr: inLoop([
              "try:",
              "    await count_quakes(SavedTransport({'/d': {'status': 503, 'body': {'error': 'busy'}, 'seconds': 0.1}}), '/d')",
              "    out = 'no error'",
              "except HTTPStatusError as _e:",
              "    out = _e.status",
            ], "from saved_http import SavedTransport, HTTPStatusError"),
            expected: py.int(503),
          },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Get JSON with retries and backoff",
        prompt: "Write `get_json(transport, url, attempts, timeout, backoff)`. Each attempt awaits `transport.get(url)` within `timeout` seconds. A 200 returns `response.json()`. A timeout or a 5xx status is temporary: wait `backoff × 2**attempt` (attempt counted from 0) and try again, up to `attempts` attempts in total. Any other status is permanent: raise `HTTPStatusError` (from `saved_http`) at once. If every attempt failed temporarily, raise `RuntimeError`.",
        spec: [
          ["Coroutine", "`async def get_json(transport, url, attempts, timeout, backoff)`"],
          ["Temporary", "TimeoutError or status ≥ 500 → wait, then retry (no wait after the last attempt)"],
          ["Permanent", "status 4xx → `response.raise_for_status()` (HTTPStatusError) immediately"],
          ["Gives up", "`RuntimeError` after `attempts` temporary failures"],
        ],
        starter: src`
import asyncio
from browser_loop import run
from saved_http import SavedTransport, HTTPStatusError

async def get_json(transport, url, attempts, timeout, backoff):
    response = await transport.get(url)
    return response.json()
`,
        answer: src`
import asyncio
from browser_loop import run
from saved_http import SavedTransport, HTTPStatusError

async def get_json(transport, url, attempts, timeout, backoff):
    for attempt in range(attempts):
        try:
            async with asyncio.timeout(timeout):
                response = await transport.get(url)
            if response.status == 200:
                return response.json()
            if response.status < 500:
                response.raise_for_status()
        except TimeoutError:
            pass
        if attempt < attempts - 1:
            await asyncio.sleep(backoff * 2 ** attempt)
    raise RuntimeError(f"no answer from {url} after {attempts} attempts")
`,
        alternatives: [
          src`
import asyncio
from saved_http import HTTPStatusError

async def get_json(transport, url, attempts, timeout, backoff):
    delay = backoff
    for attempt in range(1, attempts + 1):
        try:
            response = await asyncio.wait_for(transport.get(url), timeout=timeout)
        except TimeoutError:
            pass
        else:
            if response.status == 200:
                return response.json()
            if response.status < 500:
                raise HTTPStatusError(response.status, url)
        if attempt == attempts:
            break
        await asyncio.sleep(delay)
        delay *= 2
    raise RuntimeError("gave up")
`,
        ],
        wrong: [
          {
            code: src`
import asyncio

async def get_json(transport, url, attempts, timeout, backoff):
    for attempt in range(attempts):
        try:
            async with asyncio.timeout(timeout):
                response = await transport.get(url)
            if response.status == 200:
                return response.json()
        except TimeoutError:
            pass
        await asyncio.sleep(backoff * 2 ** attempt)
    raise RuntimeError("gave up")
`,
            fails: ["permanent", "gives-up"],
            why: "a 404 is retried as if it might change, and it waits once more after the last attempt",
          },
          {
            code: src`
import asyncio

async def get_json(transport, url, attempts, timeout, backoff):
    for attempt in range(attempts):
        try:
            async with asyncio.timeout(timeout):
                response = await transport.get(url)
        except TimeoutError:
            continue
        if response.status == 200:
            return response.json()
        if response.status < 500:
            response.raise_for_status()
    raise RuntimeError("gave up")
`,
            fails: ["recovers", "gives-up"],
            why: "no backoff: the retries hammer the server immediately",
          },
        ],
        hints: [
          "Loop over attempt numbers; each attempt is `transport.get` inside `async with asyncio.timeout(timeout)`.",
          "Decide by outcome: 200 returns; 4xx raises via `raise_for_status()`; a timeout or 5xx falls through to the retry wait.",
          "Wait `backoff * 2 ** attempt` only if another attempt follows; after the loop, raise RuntimeError.",
        ],
        task: {
          files,
          checks: [
            {
              kind: "expr",
              id: "recovers",
              label: "a hang then a 503 then a 200: backoff waits, then the JSON",
              show: "attempts=3, timeout=1, backoff=0.5",
              expr: inLoop([
                "_t = SavedTransport({'/c': [{'hang': True}, {'status': 503, 'seconds': 0.1}, {'status': 200, 'body': {'count': 466}, 'seconds': 0.1}]})",
                "_r = await get_json(_t, '/c', 3, 1, 0.5)",
                "out = [_r, round(loop.time(), 2), len(_t.requests)]",
              ], "from saved_http import SavedTransport"),
              expected: py.list(py.dict([[py.str("count"), py.int(466)]]), py.float(2.7), py.int(3)),
            },
            {
              kind: "expr",
              id: "permanent",
              label: "a 404 raises at once, without retrying",
              hidden: true,
              expr: inLoop([
                "_t = SavedTransport({})",
                "try:",
                "    await get_json(_t, '/missing', 4, 1, 0.5)",
                "    _what = 'nothing'",
                "except HTTPStatusError as _e:",
                "    _what = _e.status",
                "out = [_what, len(_t.requests), round(loop.time(), 2)]",
              ], "from saved_http import SavedTransport, HTTPStatusError"),
              expected: py.list(py.int(404), py.int(1), py.float(0.05)),
            },
            {
              kind: "expr",
              id: "gives-up",
              label: "after the last attempt it gives up without waiting again",
              hidden: true,
              expr: inLoop([
                "_t = SavedTransport({'/d': {'status': 500, 'seconds': 0.2}})",
                "try:",
                "    await get_json(_t, '/d', 2, 1, 1)",
                "    _what = 'nothing'",
                "except RuntimeError:",
                "    _what = 'RuntimeError'",
                "out = [_what, len(_t.requests), round(loop.time(), 2)]",
              ], "from saved_http import SavedTransport"),
              expected: py.list(py.str("RuntimeError"), py.int(2), py.float(1.4)),
            },
          ],
        },
      },
      {
        id: "c2",
        title: "Fetch many days under a limit",
        prompt: "Write `fetch_days(transport, urls, limit)` for a data pipeline: fetch every URL concurrently with at most `limit` requests in flight, and return `(data, failed)`: a dictionary from URL to parsed JSON for 200 responses, and a sorted list of URLs whose response wasn't 200.",
        spec: [
          ["Coroutine", "`async def fetch_days(transport, urls, limit)`"],
          ["Returns", "`({url: json}, [failed urls, sorted])`"],
          ["Rule", "at most `limit` `transport.get` calls in flight at once; all URLs requested once"],
        ],
        starter: src`
import asyncio
from browser_loop import run
from saved_http import SavedTransport

async def fetch_days(transport, urls, limit):
    return {}, []
`,
        answer: src`
import asyncio
from browser_loop import run
from saved_http import SavedTransport

async def fetch_days(transport, urls, limit):
    gate = asyncio.Semaphore(limit)
    data = {}
    failed = []

    async def fetch(url):
        async with gate:
            response = await transport.get(url)
        if response.status == 200:
            data[url] = response.json()
        else:
            failed.append(url)

    await asyncio.gather(*(fetch(url) for url in urls))
    return data, sorted(failed)
`,
        alternatives: [
          src`
import asyncio

async def fetch_days(transport, urls, limit):
    sem = asyncio.Semaphore(limit)

    async def one(url):
        async with sem:
            return url, await transport.get(url)

    pairs = await asyncio.gather(*(one(u) for u in urls))
    data = {u: r.json() for u, r in pairs if r.status == 200}
    failed = sorted(u for u, r in pairs if r.status != 200)
    return data, failed
`,
        ],
        wrong: [
          {
            code: src`
import asyncio

async def fetch_days(transport, urls, limit):
    data = {}
    failed = []
    responses = await asyncio.gather(*(transport.get(url) for url in urls))
    for url, response in zip(urls, responses):
        if response.status == 200:
            data[url] = response.json()
        else:
            failed.append(url)
    return data, sorted(failed)
`,
            fails: ["limited"],
            why: "no semaphore: every request is in flight at once",
          },
          {
            code: src`
import asyncio

async def fetch_days(transport, urls, limit):
    gate = asyncio.Semaphore(limit)

    async def fetch(url):
        async with gate:
            response = await transport.get(url)
        response.raise_for_status()
        return url, response.json()

    pairs = await asyncio.gather(*(fetch(url) for url in urls))
    return dict(pairs), []
`,
            fails: ["report"],
            why: "one failed day raises and loses every other day's data",
          },
        ],
        hints: [
          "One semaphore, shared by a small coroutine that fetches one URL.",
          "Hold the semaphore only around `transport.get`; sort the outcome into data or failed afterwards.",
          "`gather` one fetch per URL, then return the dictionary and the sorted failures.",
        ],
        task: {
          files,
          checks: [
            {
              kind: "expr",
              id: "report",
              label: "fetch_days() collects data and failures",
              show: "three days, one returns 503",
              expr: inLoop([
                `_saved = {${pyLiteral(day("01"))}: {'status': 200, 'body': ${pyLiteral(collection([q1, q2]))}, 'seconds': 0.3}, ${pyLiteral(day("02"))}: {'status': 503, 'seconds': 0.1}, ${pyLiteral(day("03"))}: {'status': 200, 'body': ${pyLiteral(collection([q3, q4]))}, 'seconds': 0.2}}`,
                "_d, _f = await fetch_days(SavedTransport(_saved), list(_saved), 2)",
                "out = [sorted(len(v['features']) for v in _d.values()), _f]",
              ], "from saved_http import SavedTransport"),
              expected: py.list(py.list(py.int(2), py.int(2)), strs(day("02"))),
            },
            {
              kind: "expr",
              id: "limited",
              label: "never more than `limit` requests in flight",
              hidden: true,
              expr: inLoop([
                "_saved = {f'/d{i}': {'status': 200, 'body': {'n': i}, 'seconds': 0.2} for i in range(9)}",
                "_t = SavedTransport(_saved)",
                "_d, _f = await fetch_days(_t, list(_saved), 3)",
                "out = [len(_d), _t.most_active, round(loop.time(), 2), len(_t.requests)]",
              ], "from saved_http import SavedTransport"),
              expected: py.list(py.int(9), py.int(3), py.float(0.6), py.int(9)),
            },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print? (`backoff * 2 ** attempt` for attempts 0, 1, 2)",
        program: src`
backoff = 0.25
print([backoff * 2 ** attempt for attempt in range(3)])
`,
        choices: ["[0.25, 0.5, 1.0]", "[0.25, 0.5, 0.75]", "[0.5, 1.0, 2.0]", "[0.25, 0.25, 0.25]"],
        answer: 0,
        why: "`**` binds before `*`: 0.25 × 1, × 2, × 4. Each wait doubles.",
      },
      {
        id: "q2",
        prompt: "A common mistake: a client retries every failed request three times. Which response should never be retried?",
        choices: ["404 Not Found", "503 Service Unavailable", "A timeout", "429 Too Many Requests (after waiting)"],
        answer: 0,
        why: "A missing resource will be missing on the next attempt too. Retry temporary failures only.",
      },
      {
        id: "q3",
        prompt: "You must download 500 pages from an API that allows 8 concurrent requests and sometimes times out. Which design fits?",
        choices: [
          "gather 500 tasks, each taking a shared Semaphore(8) and using a per-request timeout with a few backoff retries",
          "One request at a time with no timeout",
          "Start all 500 at once and retry the whole batch if anything fails",
          "Wrap the entire gather in a single 5-second timeout",
        ],
        answer: 0,
        why: "The semaphore respects the limit, per-request timeouts and retries handle the flaky ones, and gather keeps all results.",
      },
    ],
    review: [
      "Check the status before parsing; turn errors into clear exceptions.",
      "Retry only temporary failures, a limited number of times, with growing waits and a timeout per attempt.",
      "Semaphore + gather + a report of failures = a robust async client.",
      "Next module: organising a growing program into well-separated parts.",
    ],
  },
];
