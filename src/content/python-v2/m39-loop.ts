/**
 * The event loop used by M39 (Async Python), as the text of `browser_loop.py`.
 *
 * asyncio.run() can't run in a browser page: Pyodide installs its own JavaScript-driven loop as the running loop, and
 * running another one synchronously needs WebAssembly stack switching. So M39 passes the standard
 * `asyncio.run(main, loop_factory=...)` a real asyncio event loop (a BaseEventLoop subclass) whose clock is virtual:
 * when every task is waiting on a timer, the clock jumps to the next timer instead of sleeping. Tasks, gather,
 * TaskGroup, cancellation, timeouts, semaphores and queues are CPython's own asyncio code, unchanged; only waiting is
 * instantaneous. That is the same idea as test tools with a mock clock (trio's autojump clock, pytest's looptime), and
 * it makes timings exact, so checks can test that work overlapped: three 0.2 s waits run together finish at 0.2.
 * On a computer the same programs run with `asyncio.run(main())`. Verified identical on CPython 3.14.
 */

/** Python source in a template literal: the first newline is dropped so the code starts at column 0. */
const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

export const LOOP_PY = src`
"""A real asyncio event loop with a virtual clock, for Python running in a web page.

    from browser_loop import run
    run(main())          # on a computer: asyncio.run(main())

Everything inside main() is ordinary asyncio. When all tasks are waiting for
timers (asyncio.sleep, timeouts), the clock jumps straight to the next timer, so
loop.time() reads like a stopwatch that never has to wait.
"""
import asyncio


class BrowserLoop(asyncio.BaseEventLoop):
    def __init__(self):
        super().__init__()
        self._clock = 0.0
        self._selector = self

    def time(self):
        return self._clock

    def select(self, timeout):
        if timeout is None:
            raise RuntimeError("deadlock: every task is waiting and nothing will ever wake one up")
        self._clock += timeout
        if self._clock > 10_000:
            raise RuntimeError("the clock passed 10,000 seconds: a loop is probably waiting forever")
        return []

    def _process_events(self, event_list):
        pass

    def _write_to_self(self):
        pass


def run(main):
    """asyncio.run(main) on a BrowserLoop."""
    outer = asyncio.events._get_running_loop()
    asyncio.events._set_running_loop(None)
    try:
        return asyncio.run(main, loop_factory=BrowserLoop)
    finally:
        asyncio.events._set_running_loop(outer)
`;

/** The same loop, compact, for lesson examples (which can't import files). */
export const LOOP_HEAD = src`
import asyncio

class BrowserLoop(asyncio.BaseEventLoop):  # a real asyncio loop whose clock jumps instead of waiting
    def __init__(self):
        super().__init__()
        self._clock, self._selector = 0.0, self
    def time(self):
        return self._clock
    def select(self, timeout):
        self._clock += timeout
        return []
    def _process_events(self, events):
        pass
    def _write_to_self(self):
        pass

def run(main):  # on a computer: asyncio.run(main)
    outer = asyncio.events._get_running_loop()
    asyncio.events._set_running_loop(None)
    try:
        return asyncio.run(main, loop_factory=BrowserLoop)
    finally:
        asyncio.events._set_running_loop(outer)

`;

export const loopFiles = { "browser_loop.py": LOOP_PY };

/**
 * `saved_http.py`: an async stand-in for an HTTP client. There is no network in the page, so `get(url)` waits for the
 * latency given with each saved answer (on the virtual clock) and returns a Response with a status and a JSON body.
 * The bodies are real USGS earthquake data (D08), trimmed. A list of answers is served in order, one per request,
 * repeating the last; `{"hang": True}` never answers (only a timeout ends the wait); an unknown URL answers 404.
 */
export const SAVED_HTTP_PY = src`
"""An async HTTP stand-in that answers from saved responses after their latency.

    transport = SavedTransport({url: {"status": 200, "body": {...}, "seconds": 0.3}})
    response = await transport.get(url)
    response.status, response.json()
"""
import asyncio
import json


class HTTPStatusError(Exception):
    def __init__(self, status, url):
        super().__init__(f"{status} for {url}")
        self.status = status
        self.url = url


class Response:
    def __init__(self, url, status, body):
        self.url = url
        self.status = status
        self.text = body if isinstance(body, str) else json.dumps(body)

    def json(self):
        return json.loads(self.text)

    def raise_for_status(self):
        if self.status >= 400:
            raise HTTPStatusError(self.status, self.url)


class SavedTransport:
    def __init__(self, saved):
        self.saved = saved
        self.requests = []
        self.active = 0
        self.most_active = 0

    async def get(self, url):
        self.requests.append(url)
        entry = self.saved.get(url, {"status": 404, "body": {"error": "Not Found"}, "seconds": 0.05})
        if isinstance(entry, list):
            entry = entry.pop(0) if len(entry) > 1 else entry[0]
        self.active += 1
        self.most_active = max(self.most_active, self.active)
        try:
            if entry.get("hang"):
                await asyncio.sleep(3600)
            await asyncio.sleep(entry.get("seconds", 0.05))
        finally:
            self.active -= 1
        return Response(url, entry.get("status", 200), entry.get("body", {}))
`;

export const asyncFiles = { "browser_loop.py": LOOP_PY, "saved_http.py": SAVED_HTTP_PY };

/**
 * An expr check body that runs `lines` inside a coroutine on the browser loop. The lines may use `loop` (the running
 * loop) and must assign `out`; the check's result is `out`.
 */
export const inLoop = (lines: string[], setup = "") =>
  [
    "import asyncio",
    "from browser_loop import run as _run",
    ...(setup ? [setup] : []),
    "async def _check():",
    "    loop = asyncio.get_running_loop()",
    ...lines.map((l) => "    " + l),
    "    return out",
    "result = _run(_check())",
  ].join("\n");
