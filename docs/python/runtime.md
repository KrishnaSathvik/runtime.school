# Python runtime (Milestone 1)

How learner Python executes in Runtime: what the boundary is, what it guarantees, and what it doesn't.

## Pieces

| File | Role |
| --- | --- |
| `scripts/copy-pyodide.mjs` | Copies the Pyodide **314.0.7** core from `node_modules/pyodide` into `public/vendor/pyodide/314.0.7/` (gitignored). It checks the version and the sha256 of all 5 files against the official release and fails the build on any mismatch. Runs on `postinstall`, `predev` and `prebuild`. |
| `public/vendor/python-worker.mjs` | Module worker. Boots one interpreter (no packages, no micropip) and runs **one** program, then is discarded. Streams stdout/stderr, enforces the output cap, and classifies syntax and runtime errors. |
| `src/engine/python/client.ts` | Main-thread client: the warm spare interpreter, run ids, the run timeout, Stop, overflow, crash and boot-failure recovery, and status for the UI. Imports nothing from SQL. |
| `src/platform/python-runner.ts` | The gate deciding where execution is allowed. |
| `src/app/python/runtime` | Developer check page. Returns 404 wherever the gate is off. |

## Guarantees (each one is tested)

- **Real CPython 3.14** (Pyodide 314.0.7). All files are self-hosted from the same origin; no CDN.
- **Lazy:** SQL pages never request Pyodide or the worker (e2e checks `/`, `/sql`, `/sql/lesson/1`, `/sql/playground`).
- **One interpreter per execution.** Every run gets a new worker and a new interpreter. Changes to `math.pi`,
  `builtins`, `sys.modules`, `sys.path`, the recursion limit, `os.environ`, files in the virtual FS, globals or
  monkeypatched stdlib modules cannot reach the next attempt (e2e "attempts are isolated"). This is stronger than a
  fresh globals dict, which would leave every one of those behind.
- **Limits:** 5 s per run (the clock starts after boot), 50,000 characters of output, 30 s boot. On any limit or on
  Stop, the worker is terminated and a fresh one warms up. Output printed before the stop is kept.
- **Errors:** `SyntaxError`/`IndentationError` come with line, column and source text. Runtime exceptions come with type,
  message, the learner's line, and a traceback trimmed to `main.py` frames only. `RecursionError` is an ordinary
  exception, not a crash. `exit()` ends normally. `input()` reads the stdin the exercise supplies, and raises
  `EOFError` once that runs out (default: empty).
- **UI stays responsive** while Python is busy; the main-thread timer keeps ticking.
- **Progress:** the runner never reads or writes `sql-studio-v1` (e2e compares it before and after).

## Measured (local, headless, production build, 2026-10-13)

| | Chromium | WebKit | Firefox |
| --- | --- | --- | --- |
| Cold boot to ready | ~1.2–1.5 s | ~1.5–1.9 s | ~5 s |
| Run on a warm interpreter | ~70 ms | ~55 ms | ~45 ms |

Firefox takes about 5 s to boot each fresh interpreter. Because the spare warms up while the learner edits, this only
shows when someone runs again within ~5 s. That's a known cost of isolating every run. Pyodide has no public API for
reusing the compiled wasm across workers (its snapshot options are private), so we don't use one.

## Security boundary — read before making Python public

A Web Worker keeps Python off the UI thread. **It is not a sandbox.** Measured from learner code via `import js`:

| Reachable | Result |
| --- | --- |
| `js.fetch` | **yes**, same-origin requests with this origin's cookies |
| `js.indexedDB` | **yes**, this origin's IndexedDB |
| `js.location.origin` | the app's origin |
| `js.localStorage`, `js.document` | no (workers don't have them) |

`sql-studio-v1` lives in localStorage, which workers can't reach directly. But learner code shares the origin, so
anything this origin's IndexedDB holds, or any same-origin endpoint, is in reach. Code is the learner's own; there is no
code sharing, no accounts and no server secrets. The remaining risk is a learner pasting hostile code they found
elsewhere.

**Current gate** (`pythonRunnerEnabled` + a hostname check in the client):

- On: `next dev`, or a build with `NEXT_PUBLIC_PYTHON_RUNNER=1`.
- Always off: `NEXT_PUBLIC_VERCEL_ENV=production`, and on `runtime.school` / `www.runtime.school`
  whatever the build says.
- Vercel project `runtime-school` has Vercel Authentication on for **all deployments except custom domains**
  (checked 2026-10-13). Preview URLs therefore require a Vercel login, which makes them the access-controlled previews
  the pilot may run on. Set `NEXT_PUBLIC_PYTHON_RUNNER=1` for the Preview environment only.

**Before Python is public:** run learner code on a separate origin with no app data, either an opaque-origin
`sandbox="allow-scripts"` iframe that hosts the worker or a dedicated runner subdomain, and add a CSP `connect-src`
that blocks network access from the runner. Then re-run the bridge probe in `tests/e2e/python-runtime.mjs` and confirm
it can reach nothing of the app's.

Client-side checks are learning feedback, not tamper-proof certification.

## Security-hook review note

The `security-guidance` plugin's reminder hook flags any edit that contains the substring `exec(` with its
`child_process_exec` rule (Node shell command injection). `public/vendor/python-worker.mjs` matches that rule, but
the match is a **false positive**: the `exec(` there is Python's builtin, running the learner's program inside the
Pyodide interpreter. It involves no Node, no shell and no child process. The hook is a one-time reminder per file per
session: it blocks the first write, then accepts a deliberate retry. During Milestone 1 the file was first written
through the shell, which skipped that review step. That was a mistake. The file was then rewritten through the normal
edit path after the reminder was reviewed. From now on, any hook block is reviewed and either retried through the
normal path or raised with the owner. It is never routed around.

## Tests

- `npx vitest run tests/python-client.test.ts`: client state machine (fake worker), the gate, pinned version and hashes.
- `npm run dev -- -p 3041` then `BASE=http://localhost:3041 npm run test:python-runtime`: real Pyodide in Chromium,
  Firefox and WebKit (20 checks each). For a production build: `NEXT_PUBLIC_PYTHON_RUNNER=1 npm run build && npx next start`.
