# Python pilot — plan (verified against the current app)

Goal: a learner opens Python, runs real code, makes mistakes, understands them, passes meaningful
checks, and comes back later with drafts and completion intact. That means one lesson (Variables and
Values) built end to end. It does not mean a course.

## 0. What the brief got right, and what this plan changes

Checked against the repo and production on 2026-10-13.

| Brief says | Actual app | Plan |
| --- | --- | --- |
| Routes `/skills/python`, `/learn/python/...`, `/practice/python` | Canonical learner URLs are `/sql/...` (`src/app/sql/*`). `/learn`, `/skills/*`, `/practice`, `/projects` are **legacy**, sent `X-Robots-Tag: noindex` in `next.config.ts` | Mirror SQL instead: `/python`, `/python/lesson/[slug]`, later `/python/practice`, `/python/projects`, `/python/playground`. Update `subjects.ts` `href` to `/python` |
| "Reuse the subject switcher" | None exists. The canonical `rt/Shell.tsx` hardcodes SQL nav (`NAV_FALLBACK`) and SQL `TOOLS`. Only the legacy `AppShell` uses `subjectFromPath` | Make `Shell` take a `subject` prop and read nav and tools from the subject registry. SQL output must be byte-identical |
| Pin Pyodide 314.0.7 | Confirmed: npm `latest` = 314.0.7 (2026-09-14). The `314.1.0.dev0` doc link is a dev build | Pin `pyodide@314.0.7` exactly. Self-host it like sql.js (`public/vendor/`) rather than using a CDN |
| Separate Python progress, `sql-studio-v1` untouched | Store is zustand `persist` under `sql-studio-v1`, v3, with `migrateLearning` normalising on load. Stats are keyed by **numeric** lesson id. `progress-adapter.ts` already reserves `python:<slug>` refs and returns `false` for non-SQL | Put Python in a **separate persisted store** (`runtime-python-v1`). Do not add fields to the SQL store, because `migrateLearning` could drop or normalise them. Connect it to `isLessonRefMastered` and `subjectProgressSummary` |
| Independent vs assisted, as SQL does | True: `AttemptState.guided/hints/revealed`, a confirm step before hint/answer, "Try without help", and mastery = 2 independent solves + concept check | Same rules and the same UI copy for Python |
| Timeouts / stop runaway code | The SQL client already terminates and recreates its worker (`sql-client.ts`: supersede, boot timeout, `discardWorker`) | Copy that pattern. Production has **no COOP/COEP**, so `SharedArrayBuffer` interrupts are not available. Stop = `worker.terminate()` + respawn. Don't add COEP site-wide, because it would break the inline Google tag |
| Worker isn't a sandbox | Correct. The worker is same-origin, so learner code can `import js` and call `fetch` or IndexedDB on runtime.school. The site has no secrets, no auth and no CSP, so the pilot risk is mainly self-harm (the learner's own local data) | Pilot: same-origin worker, documented. Before public launch, move the runner into a sandboxed iframe on a separate origin (opaque `sandbox="allow-scripts"` or a `run.` subdomain) and evaluate a CSP `connect-src` |
| Backup / continuation shared | Settings export/import serialises only the SQL store; `Hydration.tsx` cross-tab sync listens only for `sql-studio-v1` | Extend backup to `{ sql, python }`. Old SQL-only backup files must still import. Add cross-tab sync for the Python key |
| Keep Python "Planned" until accepted | Currently `availability: "next"` ("Coming next") | Leave as `next` and hide behind a direct URL until acceptance passes, then flip to `available` |

## 1. Architecture

```
rt/Shell (subject-aware)  ── shared: nav, path bar, ⌘K, theme, Pager, tabs, hint/answer confirm, concept check UI
 ├─ SQL   : rt/Editor (lang-sql) · sql-client → /vendor/engine.js (sql.js) · engine/grading.ts      [unchanged]
 └─ Python: py/Editor (lang-python) · python-client → /vendor/python/worker.js (Pyodide 314.0.7) · engine/python-grading
            progress: usePython store (runtime-python-v1), refs python:<slug>
```

New code lives in its own folders (`src/engine/python/`, `src/features/py/`, `src/content/python/`) so
SQL modules never import from Python modules and Python modules never import from SQL modules.

## 2. Milestones

### M1 — Execution foundation (no UI beyond a dev page)
- `scripts/copy-pyodide.mjs` (run in `postinstall`/`prebuild`) copies the core Pyodide files
  (`pyodide.asm.js/.wasm`, `python_stdlib.zip`, `pyodide-lock.json`, `pyodide.mjs`) into `public/vendor/python/`.
- Worker protocol with request ids (`init`, `run`, `check`), avoiding the SQL client's "no request ids" limitation.
- Each `run` and each `check` gets a fresh globals dict (`pyodide.globals` is never reused), so earlier runs can't make a wrong answer pass.
- Capture stdout and stderr through `setStdout`/`setStderr` with a byte cap (e.g. 64 KB, then truncate with a notice).
  Classify `SyntaxError` (with line and column), runtime exceptions (type, message, user-code line, trimmed traceback) and timeouts.
- Timeouts: boot 30 s; run 5 s; on expiry terminate the worker, respawn it, and report "stopped after 5 s".
- No `micropip` and no package loading in the pilot.
- Unit tests (vitest + a fake worker, like the existing `__setWorkerFactory`) cover the client state machine. Real Pyodide is exercised in e2e only.
- **Exit:** `print`, a syntax error, `1/0` and `while True: pass` all behave correctly in Chrome, Safari and Firefox, including mobile Safari; the worker recovers after a timeout; the Vercel preview serves the `.wasm` with the correct MIME type.

### M2 — Python grader
- Check spec per task (data, not code strings):
  `{ kind: "output", expected, normalize? }`, `{ kind: "vars", names: { price: 12, ... } }`,
  `{ kind: "function", name, cases: [{ args, expect }] }`, plus `requireDefined` / `forbid` (e.g. no hardcoded literal for hidden cases).
- The checks run *inside* the worker after the learner's code, in the same fresh namespace. Results come back as a list
  `{ label, ok, detail }` that the same visible-check UI renders.
- Function tasks include hidden cases (as in the brief, `return 48` fails).
- Feedback copy for each failure type: syntax, runtime, wrong output (show expected vs actual), wrong variable value, wrong return, missing name, timeout.
- **Exit:** unit tests over the spec evaluator plus an e2e test with real Pyodide for each failure type.

### M3 — Workspace + shell
- `Shell` gets a `subject` prop; nav, tools and status line come from `subjects.ts`. Diff the SQL snapshot before and after: no visual change.
- `py/Editor`: add `@codemirror/lang-python@6.2.1`, reuse `editor-theme.ts`, keep Mod+Enter run / Shift+Mod+Enter check, 4-space indent, line numbers, error-line highlight.
- Console panel (stdout, stderr, exception), Stop button while running, Reset to starter, file tab `main.py`.
- Loading states: "Loading Python… (first time ~N MB)", ready, running, done, failed with Retry.
- Lazy load: the worker boots only when a Python activity mounts or on first Run. It never boots on SQL pages.

### M4 — Pilot lesson: Variables and Values
- `src/content/python/` with its own `PythonLesson` type: concept, example, walkthrough steps (runnable),
  2 tasks (vars + print; small `calculate_total` function with hidden cases), hints, solution, concept check.
- Route `/python/lesson/variables-and-values`, plus a `/python` overview page that lists only the lessons that actually exist.
- Same stage flow and mastery rule as SQL (Understand → Challenge 1 → Challenge 2 → Concept check → Complete).
  Drafts save as the learner types and are not overwritten by failed or timed-out runs.
- Write the copy by hand and review it. Do not generate it.

### M5 — Integration + acceptance
- `usePython` store connected to `progress-adapter` (mastery, continue card); home page Python card; ⌘K search entries for Python lessons that exist.
- Backup export/import `{ sql, python }` with backward compatibility; cross-tab sync.
- Targeted e2e `tests/e2e/python-pilot.mjs` (playwright, same style as existing suites), covering the 10 acceptance checks in the brief:
  run example → wrong code feedback → fix → both challenges → concept check → mastery; hint ⇒ no independent credit;
  reload restores draft and completion; infinite loop → Stop → runs again; SQL `sql-studio-v1` byte-identical before and after;
  desktop 1280 and mobile 390 widths, including the software keyboard and console visibility.
- Plus `npm test` (unit) and the existing `test:e2e` SQL smoke only, not all 12 suites.
- Run against a Vercel **preview** deploy, not just localhost.
- **Deliverable:** URL, screenshots, test output, and a written limitations note (isolation boundary, client-side checks are not certification, browser support).
- Then flip Python to `available`, in a separate commit and a separate deploy from SQL.

## 3. Afterwards (not in this pilot)
1. Python Foundations module: output, types, strings, numbers, comparisons, simple functions, plus one mini-project (Order Total Calculator).
2. Then control flow → collections → functions/modules/exceptions → files/JSON/CSV (in-memory FS) → testing → NumPy/pandas (lazy `loadPackage`) → projects whose artifacts are `.py` files plus test evidence.
3. Before public launch: the cross-origin sandboxed runner.

## 4. Explicitly out of scope
Full course, AI tutor, server-side execution, package installation, multi-file IDE, PySpark, accounts/certificates,
fake Python practice or projects in nav, any SQL content or behaviour change.

## Open questions for the owner
1. Python URLs: `/python/...` mirroring `/sql/...` (recommended), or the brief's `/learn/python/...` (a legacy, noindex tree)?
2. Self-host Pyodide in `public/vendor` (recommended; ~10 MB core on Vercel) or load from the jsDelivr CDN?
3. OK to ship the pilot same-origin and do the cross-origin runner before Python is listed as available?
