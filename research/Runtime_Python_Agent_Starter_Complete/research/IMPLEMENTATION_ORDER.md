# Runtime Python: practical writing and release order

**No implementation or repo changes were made in this research task.** Use the existing isolated Python worktree and coordinate integration with the other local agent before touching overlapping workspace files.

## Content waves

| Wave | Lessons | Independent bank | Projects/cases | Engine requirement | Go/no-go |
|---|---|---|---|---|---|
| A | Existing Variables and Values + remainder of PY01 (5 new) | PY01 (10 drafts to complete) | Retail Order Engine scoped | Core Pyodide | Beginner can solve without new untaught concepts |
| B | PY02 and PY03 (12) | PY02–PY03 (20) | Start from Zero track | Core Pyodide | Strings and decisions cases pass hidden boundaries |
| C | PY04 and PY05 (15) | PY04–PY05 (20) | Broken Customer Feed case | Core Pyodide | Loop and record exercise progression audited |
| D | PY06–PY08 (22) | PY06–PY08 (30) | Customer Toolkit, Event Investigation, CSV Sales and second case | Core Pyodide + fixture mounting | Reusable functions, file exports work |
| E | PY09 (6) | PY09 (10) | Advanced tracks | Core Pyodide plus multi-file when needed | Classes, generators and docs correct |
| F | PY10–PY11 (13) | PY10–PY11 (20) | Marketplace EDA | NumPy/pandas pinned/hosted/lazy-loaded | Real package imports and dataset checks pass across browsers |
| G | PY12 (6) | PY12 (10) | Mini ETL | Fixture/exports, idempotence | End-to-end reproducibility and manifest evidence |

## Authoring priority in Wave A

1. Audit and preserve deployed pilot lesson `python:variables-and-values` as is; patch issues without changing its ID/credit semantics.
2. `Print, Comments, and Execution Order`: stdout vs expression value; actual `NameError`/`SyntaxError`; no need for functions.
3. `Numbers and Arithmetic`: / versus //, %, precedence, negative arithmetic, decimal precision.
4. `Types and Type Conversion`: type/str/int/float conversions, exceptions, avoid silently treating strings as numbers.
5. `Names, Reassignment, and Augmented Assignment`: mutation vs rebinding; `x += 1` vs `x = x + 1`; distinguish equality comparison.
6. `Expressions and a First Program`: integrate prior concepts in a simple multi-step calculation, demonstrate independent solving.

**Add only a few independent problems with those lessons; do not surface all 120 until their full spec, runnable checks and solution testing are complete.**

## Commit and safety

- Keep SQL untouched; never re-use `sql-studio-v1` progress identities.
- Python progress remains `runtime-python-v1`; do not ship invented modules as completed.
- Do not push or deploy content until review and the separate-origin Python runner safety gate.
- A public lesson page with executable Python must respect the production runner gate.
- An exercise with `input()` in a source PDF is adapted to passed-in fixtures/function parameters because interactive stdin is unsupported in the pilot.
- Run focused tests and real-browser journeys, not all SQL suites unless an actual SQL shared change requires them.
