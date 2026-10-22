# Python runner isolation: design and Phase 1 validation

Status: **in use** (2026-10-16), switched on for production 2026-10-22 with the owner's approval. Every interpreter
the client starts is a sandbox runner (`src/engine/python/sandbox.ts`). `src/platform/python-runner.ts` is the only
gate (`NEXT_PUBLIC_PYTHON_RUNNER=0` turns Python off). Launch items still open: step 3 below (production-origin probe,
real devices, CSP reporting).

## Problem

Learner Python runs in Pyodide inside a Web Worker. A worker is not a sandbox. On the app's own origin, learner code
can call `js.fetch` with the site's cookies and open the site's IndexedDB (`docs/python/runtime.md`, Security
boundary). Python must not be public until learner code can reach nothing of the app's and nothing on the network.

## Design

```
page (app origin)
 └─ <iframe sandbox="allow-scripts" src="/python-sandbox?packages=…">   opaque origin ("null")
     ├─ CSP from src/platform/python-sandbox.ts (sent by src/app/python-sandbox/route.ts)
     ├─ /vendor/python-sandbox.mjs   bootstrap: relays messages page ⇄ worker, only from window.parent
     └─ Worker(data: URL loader) → import /vendor/python-worker.mjs → Pyodide 314.0.7
          before learner code: fetch, XMLHttpRequest, WebSocket, EventSource, WebTransport, importScripts removed
```

**Layer 1: opaque origin.** The iframe has `sandbox="allow-scripts"` without `allow-same-origin`, and the host
document's CSP repeats `sandbox allow-scripts`, so it's opaque even if opened directly. An opaque origin has no
access to the app's cookies, localStorage or IndexedDB, and can't touch the parent's DOM.

**Layer 2: CSP on the host document,** which the worker inherits:

| Directive | Value | Why |
|---|---|---|
| `default-src` | `'none'` | Nothing unless listed |
| `script-src` | the bootstrap, the worker module, the Pyodide folder, `'wasm-unsafe-eval'` | Compile Python; no `eval`/`Function` from strings |
| `connect-src` | the Pyodide folder only | wasm, stdlib, lockfile and wheels; dataset bytes are handed in by the page |
| `worker-src` | `data:`, the worker module, the Pyodide folder | The loader is a `data:` URL; Firefox checks modules imported inside a worker against `worker-src` |
| `base-uri`, `form-action` | `'none'` | |

**Layer 3: no network API at run time.** Pyodide loads everything it needs during boot. Right before the learner's
program starts, the worker deletes (or locks to `undefined`) `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`,
`WebTransport` and `importScripts`. This exists because the spike found a CSP gap in Firefox (below). It also
hardens the local same-origin runner.

**Data in, results out.** The page fetches dataset editions itself, checks their sha256, and sends the bytes in the
run message (`PyMount`, `src/engine/python/client.ts`). The runner never fetches data. Results come back through
the bootstrap; every worker message still carries the per-run nonce.

**Cross-origin static files.** The runner is an opaque origin, so `/vendor/python-sandbox.mjs`,
`/vendor/python-worker.mjs` and `/vendor/pyodide/*` are served with `Access-Control-Allow-Origin: *`. They are
public, static and fetched without credentials.

## What the spike found

| Finding | Resolution |
|---|---|
| Chrome refuses a `blob:null` worker URL created in an opaque origin ("Refused to cross-origin redirects of the top-level worker script") | The worker is started from a `data:` URL loader |
| Firefox applies `worker-src` to modules imported inside a worker | `worker-src` lists the worker module and the Pyodide folder |
| Chromium refuses WebSocket under CSP asynchronously (the constructor returns an object) | The probe proves blocking with a listener that must receive nothing, not by catching exceptions |
| **Firefox let `EventSource` through the inherited `connect-src`** (the listener received `GET /es`); XHR, fetch and WebSocket were blocked | Layer 3: network constructors are removed before learner code runs. Re-probed: nothing arrives |

## Evidence

`tests/e2e/python-isolation.mjs`, run against `next dev` on port 3041, in Chromium, Firefox and WebKit (Playwright),
2026-10-16. The page plants a localStorage value, a cookie and an IndexedDB database. Learner code then tries:

| Attempt | Chromium | Firefox | WebKit |
|---|---|---|---|
| XHR to the app page, the app API (`/api/notify-interest`), an app dataset, another site, the Pyodide folder | blocked | blocked | blocked |
| IndexedDB | blocked | blocked | blocked |
| `document.cookie` | blocked (no document) | blocked | blocked |
| `eval`, `Function` from strings | blocked | blocked | blocked |
| WebSocket, fetch, EventSource, XHR to a local "attacker" listener | nothing arrived | nothing arrived | nothing arrived |
| `pyodide_js.loadPackage(<attacker URL>)` | failed, nothing arrived | failed, nothing arrived | failed, nothing arrived |
| `location.origin` | `null` | `null` | `null` |
| App localStorage afterwards | unchanged | unchanged | unchanged |

The runner was kept alive 4 seconds after the hostile program, so asynchronous connections had time to land.
In the same runs, an ordinary program, a mounted dataset file, and NumPy all worked inside the sandbox.

Before layer 3 was added, the same probe showed the CSP alone blocked every channel in Chromium and WebKit, and
every channel except `EventSource` in Firefox.

Regression: `tests/e2e/python-runtime.mjs` (60/60) and `tests/e2e/python-grading.mjs` (63/63) still pass on the
same-origin runner with layer 3 in place.

## Known limits

- **Grading is still client-side.** Isolation protects the app and the learner's browser; it doesn't stop a learner
  from faking their own result. Grades remain learning feedback (plan §1.1).
- **CPU and memory.** A hostile program can still spin until the 5 s limit, or grow memory until the tab struggles.
  The client terminates the runner on timeout. Per-run memory caps aren't available to us in the browser.
- **The Pyodide folder is reachable for scripts and fetches** (static public files only, no credentials).
- **Layer 3 means the CSP layer isn't exercised by learner code any more.** The probe above records the CSP-only
  result. Re-run it with layer 3 disabled when the CSP changes.
- **Real devices, Safari on iOS and older browser versions** haven't been tested. They must be before launch.

## Remaining work (Phase 1b, then Phase 5)

1. **Done (Phase 1b).** `createSandboxWorker` in `src/engine/python/sandbox.ts` starts one sandbox iframe per
   interpreter, relays only that iframe's messages, and terminates by removing the iframe. It's the client's
   default worker factory, so the page never loads the worker directly. Evidence: `tests/python-sandbox.test.ts`,
   `tests/e2e/python-runtime.mjs` 60/60 through the sandbox (its bridge probe now reports `origin null`), and
   `tests/e2e/python-v2-journey.mjs`.
2. Relax the `python-runner.ts` gate for access-controlled previews, only with approval.
3. Before any public launch: re-run this probe on the production origin, in all engines and on real devices.
   Add a CSP violation report endpoint and monitoring. Owner sign-off.
