# SQL and Python workspace quality audit

Investigation: 2026-10-21. Research only; no UI, engine, content, tests, configuration, datasets or grading expectations changed by this investigation. This report combines inspected local source with the coordinating investigator’s browser observations. Captures, precise execution context and limitations are consolidated in [REA_EVIDENCE.md](REA_EVIDENCE.md). It is not a claim that every requested scenario passed or that production Python is validated.

The immediate priorities are recovering superseded Python controls, accurate SQL check-count feedback, recoverable editing and honest stale feedback. Measured layouts did not show document overflow. Preserve working SQL behavior and passing draft recovery; investigate geometry with actual task context before changing layouts.

## Observed issue register

Priorities refer to proposed repair order, not implementation authorization. Historical completion is distinct from verification of currently edited code. **ID mapping:** this register uses **ED** for the editor plan’s E-prefixed IDs and **EN** for the engine plan’s E-prefixed IDs. Thus ED01 is editor recovery, while EN01 is supersession recovery. ED06 and EN06 describe the same stale-feedback issue, not two independent defects.

| ID / priority | Observed scope and evidence | Learner impact / bounded repair |
|---|---|---|
| EN01 / P1 | Python lesson challenge Run superseded by worked example “Three instructions”: example prints “Status delivered,” challenge stays running with Stop visible and Check disabled; Stop does not recover it. [Capture](evidence/python-lesson-superseded.png), `evidence/records/python-lesson-observations.json`. | Token-scoped terminal cleanup must settle old controls and explain interruption; preserve single-flight engine policy. |
| EN09 / P1 | SQL practice `customer-list` passes Check, but check list reports 200 rows while full expected/actual count is 848. `evidence/records/practice-observations.json`. | Full-result grading precedes preview slicing; defect is feedback metadata, not demonstrated wrong grading. Carry full expected/actual count to display without changing comparators or fixtures. |
| EN08 / P2 | Controlled 12-second Pyodide WASM delay: one second after Run only “running…” appeared. Stop settled and retry succeeded after removing delay. `evidence/records/13-preparation.js.result.json`. | Distinguish preparation from execution, preserving demonstrated cancellation/recovery. This is not a stalled-dataset test or benchmark. |
| EN03-SQL / P2 | SQL cross-cell supersession silently stops the earlier operation without an explanation; unlike confirmed Python stuck controls, SQL busy state settles. See central evidence record. | Explain latest-run-wins interruption; do not add worker pools or presume a wrong-grade result. |
| ED01a / P1 | `/python/learn/python-execution`, 756×469: after unique draft with `print(321)`, Reset then Cmd+Z left placeholder instead of restoring draft. `evidence/records/python-lesson-observations.json`. | Reset is not recoverable through expected Undo. Active reset changes Workbench key; use existing transaction capability without clearing assistance or historical progress. |
| ED01b / P1 | Python project: catalogue → main → catalogue, Cmd+Z did not undo the prior replacement. `evidence/records/07-python-project-actions.js.result.json`, `project-observations.json`. | Saved file text and editing history are different. Preserve per-file in-memory selection/history across navigation; do not add a new storage architecture. |
| ED03 / P1 | Python project: `ValueError` in `catalogue.py` line 2; error line control selected `main.py`. Same project probe records. | Feedback directs learner to wrong source. Carry filename and line through error display/navigation; retain current exception and grading semantics. |
| ED06a / P1 | Python lesson: independently authored equivalent solution passed Check; edit to `print('changed after passing')` left all-checks-pass feedback and historical solved text with no stale warning. [Screenshot](evidence/python-lesson-stale-check.png). | Current check appears valid for edited code. Keep historical solved credit but explicitly label previous check/source; ensure new checks capture current files. |
| ED06b / P1 | Python practice stale-check presentation reproduced in `evidence/records/practice-observations.json`. | Apply the same bounded feedback correction through shared Workbench; do not infer that untested Python surfaces are confirmed. |

The inspected active files are `src/features/python/{Lesson,Question,Project,Workbench,Results}.tsx` and `src/features/py/PyEditor.tsx`. The older Python UI tree contains different behavior; do not assume all Python routes share an older implementation’s safeguards. Exact handler map, conditional fixes and acceptance expectations appear in [EDITOR_FIX_PLAN.md](EDITOR_FIX_PLAN.md).

## Passing or neutral observations worth preserving

- A Python lesson draft marker with `print(654)` survived refresh. Python project drafts also survived refresh. Neither result proves all storage failures/concurrent-tab cases are safe; they do establish that the reproduced undo problem is not blanket persistence failure.
- No document overflow was observed at widths 1440, 768 and 390 pixels in the measured layout probes. The desktop editor measured approximately 662px wide; Python editor height measured 180px. These measurements do not establish keyboard-open mobile comfort.
- At 390px, editor document positions were approximately y=2178 in Python and y=1785 in SQL after prior activity. They were not pristine loads. Treat distance-to-editor as a usability investigation, not a confirmed excessive-scroll defect or a cross-subject performance ranking.
- No drag separators were observed. These are fixed responsive layouts; absence of a resize handle is an optional capability gap, not a malfunction.
- SQL project stage baseline subsequently ran starter code returning 20 rows; an incorrect Check provided useful alias feedback; custom Run returned 44; refresh retained the stage query parameter and draft. At widths 1440/768/390, editor width/height measured approximately 759×320 / 389×320 / 356×320px; at 390px its document y-position was approximately 1266, with no observed document overflow. Record: `evidence/records/15-sql-project-actions.js.result.json`. This does not establish full project completion or cumulative grading.

Raw geometry source: `evidence/records/sql-layout-observations.json`; central evidence report records retained paths. Some browser evidence filenames describe syntax/supersession scenarios; a filename alone is not proof of a particular defect, and this audit does not infer outcomes from it.

## Remaining source-backed targets—not reproduced bugs

| Target | Why inspect / exact source | Required next evidence |
|---|---|---|
| Full-project Reset scope (ED02) | `ProjectScreen.onReset` replaces project files with milestone starters and remounts Workbench. | Distinct edits in two files; reset selected file; verify scope labeling, changed files and recovery. |
| SQL result scroll/geometry (ED04) | `Cells.tsx::TaskCell` scrolls result into view; `src/app/sql/rt.css` has nested desktop scroll/height overrides. | Before/after editor/actions/result rectangles, caret and scroll owners at short desktop and mobile. |
| SQL keyboard versus button busy behavior (ED05) | TaskCell buttons disable while busy, but keyboard invokes `exec` without its own busy guard. | Controlled repeated shortcut plus second runnable cell; observe whether supersession is clear and UI settles. |
| Completion, selection and focus (ED07) | SQL schema-restricted completion; coarse-pointer auto-popup suppression. Python explicit Tab indentation and Escape→Tab escape. | Join alias/column completions, popup edges, selection acceptance, focus escape and multiline indentation. |
| File/result/milestone keyboard navigation (ED08) | Python tab buttons and small-screen hidden noncurrent milestone text; SQL project reference tabs already implement arrow/Home/End. | Keyboard-only navigation, accessible names, visible focus and real touch hit targets. |
| Exact-answer draft cleanup | One initial bulk-paste left visible canonical answer while saved draft became empty and Run used empty source; `exerciseDraft` suspected. | Focused fresh-session rerun distinguishing controlled-value timing, cleanup policy and automation effects. Fresh-context rerun saved and executed that exact answer correctly (18-canonical receipt). **Not reproduced**; do not change grading/content or cleanup policy from this evidence. |
| Engine preparation/cancellation/recovery | Shared SQL pending operation and Python active interpreter can affect multiple cells. | Slow load, Stop during preparation, competing cells, failure/retry and bounded cold/warm measurements; see engine plan. |

## Coverage boundary and safe next step

Confirmed evidence covers Python lesson editing/feedback and supersession, practice stale results and SQL count feedback, project file/error navigation, a controlled preparation-delay recovery case, SQL project baseline actions and selected responsive geometry. Complete success→failure→fix→check journeys across every surface, full project cumulative completion, real mobile keyboard, screen readers, completion popup accuracy, all cross-cell recovery cases and production Python isolation remain incomplete. See [ENGINE_FIX_PLAN.md](ENGINE_FIX_PLAN.md) for EN01–EN09 source boundaries and remaining cancellation/boot/mount risks.

Do not reopen curriculum or V2 architecture decisions. Keep lesson counts, problem definitions, solutions, project requirements, fixtures and comparators frozen. A future approved patch should address a small reproduced issue, run existing relevant regressions, and repeat its browser scenario. Conditional layout adjustments should follow measurements, not replace both subject layouts with one template. [IMPLEMENTATION_ORDER.md](IMPLEMENTATION_ORDER.md) defines sequencing; [ACCEPTANCE_MATRIX.md](ACCEPTANCE_MATRIX.md) tracks remaining verification.
