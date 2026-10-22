# runtime.school — Python Learn & Practice Quality Rebuild (owner's brief, condensed faithfully)

## Distinctions
- Learn: teach how Python works, why a feature exists, when to use it, how to apply it.
- Lesson challenges: small meaningful problems testing what was just learned WITHOUT copying the examples.
- Practice: independently solvable problems with clear input/output contracts, real function implementations, hidden tests, edge cases.
- Advanced topics: real programming behaviour. NEVER replace an unsupported operation with hardcoded text.

Preserve: working Python engine, datasets, navigation/UI, lesson IDs, question IDs where practical, learner progress. Content/pedagogy/grading correction, NOT a visual redesign. Don't push or deploy.

## 1. Teaching standard — every lesson answers
1 What is it? 2 Why does it exist? 3 How does it work? 4 When would you use it? 5 What mistakes to avoid? 6 Can the learner apply it without copying the example?

Structure: Concept intro (one concept, no untaught jargon/features) → Example A Understand (short runnable, explain ops + real output) → Example B Apply (meaningfully different, more realistic context, explain why) → Guided Try-It (modify one aspect, observe) → Challenge 1 independent application (original problem, same concept, not the example) → Challenge 2 transfer (different problem: concept + earlier skills) → Concept checks (execution, behaviour, mistakes, usage) → 3 progressive hints (never the full answer) → Review (summary + link forward).

Rules: one main new concept; later lessons combine earlier ones; why before obscure syntax; real executable Python; outputs from the real interpreter; never hardcoded results as implementations; no tricks / artificial syntax constraints; no syntax before prerequisites; no misleading statements; explain mistakes with real errors; modern idiomatic style. A lesson must teach what its title promises.

## 2. Meaningful scenarios
Stop using MUG/HAT/CUP, meaningless letters, arbitrary prints as primary material. Use runtime.school datasets and small fixtures.
Beginner: shopping totals, ticket eligibility, student scores, weather readings, movie names, simple text processing.
Intermediate: customer records, invoices, app config, file validation, nested API responses, object models, SQLite.
Advanced: event processing, retries, data pipelines, memory-efficient file handling, async requests, testing, concurrency, performance, reliability.
Don't force datasets where simple inputs are clearer. Every example must have a reason to exist.

## 3. Lesson challenges
C1 applies the new concept with different input or logic. C2 requires a new decision/transformation or combination with earlier concepts. Not mere renames/number/threshold/string swaps.
Bad: filter >10, challenge filter >20. Better: return order IDs of completed orders whose totals exceed a minimum.
Bad decorator: add "!". Better: count calls without changing return value; later time execution / retry recoverable failures.
Bad exceptions: bare except print "Error". Better: parse numeric strings, skip invalid, return valid ints + rejected count, catch ValueError only.
GATE: a challenge fails review if the learner can pass by reproducing the example with only a trivial constant/word changed.

## 4. Practice = genuine coding questions
Formats: function implementation; data transformation; debugging (genuinely broken code); validation; file processing; OOP implementation; testing (learner tests vs correct and defective impls); refactoring (preserve behaviour); performance (explicit constraints); integration. Prediction and code completion may remain as SUPPORTING formats, mostly early, must not dominate.

Model question — "Remove Duplicate Items": `def dedupe(items: list[str]) -> list[str]` ; return new list of distinct values in first-seen order; examples dedupe(["a","b","a","c","b"])→["a","b","c"], dedupe([])→[], dedupe(["x","x","x"])→["x"]; requirements: preserve order, don't mutate input, case-sensitive, return new list. Grader evaluates unseen inputs (empty, repeats, all-unique, case). Never grade by matching a specific implementation.

Every independent problem needs: original meaningful title; clear task; exact signature/contract; input & output definitions; constraints; ≥3 public examples/tests; relevant hidden tests; edge cases; verified reference implementation; known-incorrect implementations the tests reject; progressive hints; solution explanation; accurate prerequisite tags. Hard = harder reasoning, not formatting tricks.

Difficulty ladder example: Guided lesson — modify a function to apply 10% discount; Lesson challenge — discount rule with minimum purchase threshold; Practice easy — calculate_discount(price, rate) for varied inputs; medium — cart pricing with multiple discounts + validation; hard — pricing engine with configurable rules, error handling, tests.

## 5. Grading
Function questions: load learner code; call the function with multiple independent inputs; compare return values with the right policy; check expected exceptions; verify mutation requirements; report meaningful failures. Never substitute stdout matching for return-value grading. Hidden tests distinct from public examples (empty, single, duplicates, ordering, missing values, boundaries). Browser hidden tests are learning feedback, not tamper-proof — don't claim otherwise. Other check kinds: typed returns, stdout, exceptions, DataFrames, generated CSV/JSON files, learner-written tests, code structure only when specifically required, operation/memory budgets when defensible. Never reject a correct implementation for different valid syntax.
Per question acceptance: reference passes; starter fails; ≥2 representative wrong solutions fail for the intended reasons; multiple valid styles pass; errors explained; failures useful without leaking hidden inputs unnecessarily.

## 6. Mandatory corrections (and search for similar)
*args is a tuple; NumPy int dtype default is platform-dependent (never teach browser default as universal); prefer specific excepts over bare except; no `== True`; normal def before lambda, don't teach `name = lambda`; no private interpreter APIs (e.g. sys._is_gil_enabled) as standard practice; bitwise ops as a real concept, not appended to precedence; accurate binding/mutability/aliasing/copying; outputs match real Python. Verify ambiguous behaviour against official docs.

## 7. Unsupported / fake advanced lessons (HIGH PRIORITY)
M23 CLI: real argparse, file automation, CLI workflows; no fabricated subprocess output.
M24 Debugging: real tracebacks, strategies, logging, reproducible diagnosis; no "breakpoint()" string. Use genuinely broken runnable programs.
M30 Packaging & DB: real package structure, imports, dependency metadata, SQLite, transactions; explain venv/pip commands truthfully; don't grade printing simulated success.
M31 HTTP: recorded-response HTTP simulation through an actual HTTP-client API; requests construction, status codes, JSON, pagination, timeouts, retries, errors. No hardcoded output strings.
M36–M37 Memory & Performance: real comparisons, profiling, tracemalloc, caching, workloads; explain why results differ.
M38 Threads/Processes: real concepts; don't equate asyncio with threads; if browser can't run them, verified code walkthroughs, trace analysis, real recorded results from CPython — clearly labelled; never pretend they ran in Pyodide.
M39 Async: real working asyncio (coroutines, tasks, cancellation, timeouts, semaphores); if an API is unsupported use another genuinely executable async task. No hardcoded task results.
M40 Architecture: real organisation, interfaces, modularity, dependency boundaries, testing; multi-file, realistic responsibility.
M41–M45: real NumPy, pandas, joins, grouping, charts, file formats on appropriate datasets; inspectable output. If seaborn can't run, use matplotlib and don't claim it teaches seaborn.
M46–M50: validation & schema contracts, idempotent processing, checkpoint/recovery, structured logging/observability, safe SQL parameterisation, config management, dependency manifests, testing & CI concepts, reproducibility/deployment readiness, integrated multi-file apps. Capstone combines real skills.
Publication policy per unsupported lesson: (1) real browser-executable; (2) faithful validated simulation exercising the real API; (3) clearly labelled verified code-analysis exercise; (4) withhold from publication. Never pass a hardcoded fake as executed technology.

## 8. Progression
Beginner: small problems with numbers, strings, conditions, loops, collections. Intermediate: reusable functions, structured data, exceptions, files, classes, tests. Advanced: design, state and failures, real libraries, optimisation, multi-file. Don't force exactly 10 questions per module. Track the 500 existing question IDs individually; rewrite, replace or retire — never inflate counts. 1,250 is a later goal; repair existing first.

## 9. Learn ↔ Practice ↔ Projects
Each practice question references real prerequisite concepts; practice must not copy lesson challenges. Don't rewrite the 10 projects unless dependencies/reference code/assessments are affected; update references if concepts move. Keep existing datasets; no fake datasets or hardcoded outputs.

## 10. Automated checks
Prerequisite validation; execution correctness of every example/reference/public/hidden test; duplicate detection (incl. same reasoning with changed constants); difficulty sanity; fake-implementation detection (hardcoded expected outputs, print-only substitutes, no meaningful computation); mutation tests (wrong impls fail); content integrity; coverage of module title/concepts. Automated checks are necessary but not sufficient — editorial review too.

## 12. Safety
Stable IDs. If a question changes substantially, review completion records rather than treating old success as mastery (content versions). Accurate statuses planned → drafted → tests-pass → reviewed → published. Don't show incomplete/fake lessons as finished. Preserve SQL and Python tools. No broad frontend redesign. No push/deploy.

## 13. Completion report — actual counts, not targets
Modules reviewed/rebuilt; lessons rewritten; challenges replaced; practice rewritten; function-implementation questions added; public & hidden tests created; invalid/duplicate questions removed; factual errors fixed; fake lessons removed/rebuilt; unresolved browser limits; dataset coverage; actual test results; remaining unpublished content. Not complete while fakes, copies, or topic-less advanced modules remain.

Final objective: a learner who completes runtime.school Python can read, write, debug, test and reason about real Python programs independently.
