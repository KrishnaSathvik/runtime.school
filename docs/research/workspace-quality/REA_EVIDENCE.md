# Workspace investigation evidence

Investigation: **21 October 2026**. Local app: `http://localhost:3040`; baseline HEAD `a0842778ffac594e23a2ca8676c1a0a511bc1633`, including the pre-existing dirty working tree. This is observation and a repair proposal, not an implementation or production launch approval.

## Environment and freeze

The existing development server was reused. No install, build, generator, application test suite, source edit, dependency change or agent configuration change was performed in this pass. Browser drafts/progress were created only in disposable research profiles. The earlier approved isolated Node **24.11.0** / REA **6.7.0** installation was reused from `../runtime-v2/tooling/`; successful captures below establish CLI operation in this pass. We did not run `rea setup`.

[Baseline](evidence/baseline.json) hashes 1,416 tracked and nonignored untracked paths outside `docs/research/`, including content, solutions, fixtures, grader inputs, tests and application configuration. [Final comparison](evidence/freeze-verification.json) found **zero changed baseline paths and zero new nonresearch paths**. This preserves the starting local state, rather than comparing a dirty tree only against HEAD.

REA observed Chromium **155.0.8059.85**; host is macOS on Apple silicon. REA scenarios used 1440×1000. The initial CDP interaction screenshots are **756×469**, not the intended desktop size: a reconnect used the native headless window size. Dedicated geometry probes explicitly set 1440/768/390×900 within each script. New-context preparation/canonical probes used 1280×720. Screenshot dimensions are recorded in the [SHA-256 manifest](evidence/manifest.json). No physical mobile keyboard or screen-reader testing was performed.

The normal browser automation profile was busy, so an isolated owned Chrome was used on local CDP port 9347. REA launched separate owned browsers and reports `terminated-owned-process`. Scratch profiles/caches/raw envelopes remain ignored under `scratch/`; selected scripts, normalized receipts and screenshots are retained under `evidence/`. Receipts for separate-context probes can show the unrelated harness tab's outer URL: the tested URLs are specified below and inside the scripts.

## REA captures

| Capture | Reproduction and observed outcome | Receipt |
|---|---|---|
| SQL practice | Open `/sql/practice` (resolves to `/sql/practice/customer-list`), replace editor with `SELECT 1 AS quality_probe;`, Cmd+Enter, observe 1 row/1 column with value 1. All seven recorded steps completed. This proves Run/shortcut/output, not Check. | [Scenario](evidence/scenarios/sql-practice-scenario.json), [receipt](evidence/records/sql-practice-rea.json), [screenshot](evidence/sql-practice-rea.png). ID `ev_fcb1bbb8bc011d18a0a173c252fbddd4f2adc71b4cd09017b9975031049bb97e`. |
| Python competing cells | Open `/python/learn/python-execution`, enter `while True:\n    pass`, Run challenge, wait 300ms, Run “Three instructions, three lines”, wait 10 seconds. Example prints three lines; challenge still displays running, Stop, disabled Check. All nine steps completed. | [Scenario](evidence/scenarios/python-supersession-scenario.json), [receipt](evidence/records/python-supersession-rea.json), [screenshot](evidence/python-supersession-rea.png). ID `ev_8bd1304da120acadda64999830505fba6a527f24bca47222ae2c3b164a2e186d`. |

REA captures DOM, accessibility, URL and selected network events. Screenshots were externalized from base64 into PNGs; other receipt fields remain. Provider limitations include no artifact identity, receipt ordering rather than causal ordering, no request initiator stacks, and unfinished network activity at capture end for Python. Capture duration includes navigation and fixed waits; it is not engine execution latency. DOM/accessibility snapshots plus completed actions do not establish all keyboard or security properties.

An earlier attempted SQL route `/sql/practice/shopper-contact-list` returned 404 and never reached the editor. It was an obsolete slug from a source record, not a reproduced learner-navigation bug. The corrected visible navigation above succeeded.

## Local journey observations

Each numbered script is retained in [scenarios](evidence/scenarios/). Results below are actual browser observations; source explanations appear in the editor/engine plans. ED IDs refer to editor-plan IDs; EN IDs refer to engine-plan IDs.

| Surface / receipt | Steps and result | Evidence / classification |
|---|---|---|
| Python lesson: [02](evidence/records/02-python-lesson.js.result.json), [durable step log](evidence/records/python-lesson-observations.json) | Valid three-line program with `# quality probe` runs and passes Check; edit afterward leaves previous pass without stale label. `print(` produces line-1 SyntaxError; `print("wrong")` fails with expected/actual mismatch. Reset unique draft then Cmd+Z does not restore it. Unique draft survives reload. Long challenge followed by example gets stuck; Stop afterward does not recover. | ED01a, ED06a, EN01 confirmed. [Stale](evidence/python-lesson-stale-check.png), [syntax](evidence/python-lesson-syntax.png), [stuck controls](evidence/python-lesson-superseded.png). REA independently repeats stuck state. |
| Python practice: [10](evidence/records/10-practice.js.result.json) | `/python/practice/fix-the-note`: initial starter raises clear SyntaxError. Correct comment and enable shipping print; Check passes both existing checks. Edit to `print("edited")`; previous pass remains without stale label. | ED06b confirmed; [screenshot](evidence/python-practice-stale.png). Successful and failed feedback recorded; not all practice modes tested. |
| Python project: [07](evidence/records/07-python-project-actions.js.result.json) | `/python/projects/smart-shopping-cart`, Start, step 1. Replace catalogue, switch main→catalogue, Cmd+Z: prior edit is not undone. Raise ValueError in catalogue line 2; click line control: opens main.py. Draft survives refresh. Check produces explicit exception and not-checked cases; no Stop available during Check. | ED01b/ED03 and EN02 observed. [Helper traceback](evidence/python-project-helper-error.png); navigation outcome is in receipt. Full project completion not attempted. |
| SQL practice: [10](evidence/records/10-practice.js.result.json) | Correct customer columns pass Check. Actual table says848 while count-check says200. Edit: existing stale marker appears, previous pass remains. Incorrect column yields useful mismatch; `SELEC` gets SELECT suggestion. Ctrl+Space after `SELECT cus` includes customer_id/customers. Draft survives refresh. | EN09 confirmed; preserve stale marker/schema completion/recovery. [Edited prior pass](evidence/sql-practice-stale.png). Completion list also has generic SQL entries; no exhaustive accuracy claim. |
| SQL lesson: [11](evidence/records/11-sql-layout.js.result.json) | `/sql/lesson/meet-your-first-select`: challenge correct Check passes. Run recursive unbounded sum, then example: example completes; challenge controls recover but no interruption explanation appears, old result/check remains with edited marker. | Silent supersession clarity gap, distinct from Python stuck UI. [Screenshot](evidence/sql-lesson-supersession.png). No result/grade misattribution observed. |
| SQL project: [15](evidence/records/15-sql-project-actions.js.result.json) | `/sql/projects/retail-performance-review?stage=baseline`: Begin project→Continue to analysis. Starter Run shows20 rows; Check explains required aliases. Replace with `SELECT 44 AS project_probe;`, Run succeeds. Reload preserves query and stage query parameter. | Run/failure/recovery/draft successes; full correct project grade, later stages and cumulative completion untested. [390px view](evidence/sql-project-analysis-390.png). |
| Preparation: [13](evidence/records/13-preparation.js.result.json) | Fresh context `/python/learn/python-execution`; intercept `pyodide.asm.wasm` and delay12 seconds (one hit). One second after Run only “running…” appears. Stop settles with stopped/ready message; remove delay and retry prints recovered. | EN08 phase-label gap plus working Stop/retry baseline. [Screenshot](evidence/python-slow-preparation.png). Synthetic delay, not naturally slow device/network or stalled dataset proof. |
| Exact-paste follow-up: [18](evidence/records/18-canonical.js.result.json) | Fresh context, exact expected three-line program pasted. Stored draft matches editor and Run prints correctly. | Earlier visible-text/empty-draft mismatch **not reproduced**. No repair justified from that ambiguous initial observation. |

The scripts change only isolated browser state; they are not regression test additions. A repeat can use the installed Playwright package, an owned CDP browser on port9347 and `node evidence/scenarios/probe.mjs evidence/scenarios/<script>.js` from repository root with full research-relative paths. Ensure scratch exists; scripts write their working receipts there. Stateful scripts 07/15 require preceding navigation 06/14; other prerequisite details are in each script. Reconcile current locators before future use. Do not run against a normal learner profile.

## Geometry and foreground timing

[Geometry records](evidence/records/sql-layout-observations.json) measure all six surfaces at1440/768/390×900. No page-wide horizontal overflow was measured. At1440, ordinary editor width≈662px; Python height180px. At390, SQL/Python lesson editor document tops≈1785/2178px after prior activity, not pristine-load or equal-content measurements. SQL project analysis measured≈759/389/356px wide and320px high at1440/768/390, with y≈1266 at390. No accessible drag separator was observed. These justify testing instruction/editor navigation and flexible editor height; they do not mandate draggable panes or claim broken mobile keyboards. Screenshots show the top viewport, not the below-fold editor; coordinates establish its position.

[Timing samples](evidence/records/16-cold-timing.js.result.json) use unique output markers and measure click-to-rendered-output on this host:

| Condition | SQL trivial SELECT | Python trivial print |
|---|---:|---:|
| First Run in fresh browser context; route preloading allowed |380ms|1363ms|
| Second Run, same context |80ms|1845ms|
| Third Run, same context |61ms|1838ms|

These include browser automation overhead and runtime preparation; host/server/OS caches were not cleared. Repeated Python runs use fresh interpreters with opportunistic prewarming, so “warm” does not mean reusing globals. No percentiles, slow-device claims or optimization conclusion follows. An earlier42ms SQL number matched the expected-preview table instead of output and is **discarded**. The earlier Python80ms Run/6035ms Check pair is also only a single preload-influenced sample. True cold engine/package/data breakdown and physical-device timings remain acceptance work.

## Narrow public comparison

Only three public page visits were made; no accounts or external submissions. This is a small reference check, with almost all investigation on runtime.school. [Prior V2 research](../runtime-v2/03_COMPETITIVE_COMPARISON.md) remains the broader context; this pass does not repeat its architecture recommendations.

- [SQLBolt](https://sqlbolt.com/lesson/select_queries_introduction): browser displayed explanation followed by movie result table, editor and task list. Useful reference: keep task/result relationships visible; current page observation does not prove reset/undo or grading behavior. [Screenshot](evidence/comparison-sqlbolt.png).
- [SQLZoo](https://sqlzoo.net/wiki/SELECT_basics): browser displayed three local question editors with adjacent Submit/restore/result controls. Useful reference: locally understandable action/result ownership; no submission/cancellation semantics tested. [Screenshot](evidence/comparison-sqlzoo.png).
- [JupyterLite demo](https://jupyterlite.github.io/demo/lab/index.html): initial shell/menu loaded, but no runnable editor appeared within the two-second observation. [Official documentation](https://jupyterlite.readthedocs.io/en/stable/) describes browser storage and kernel management; that is documentation evidence, not a verified save/restart journey here. [Screenshot](evidence/comparison-jupyterlite.png). Do not adopt notebook chrome or multiple kernels from this limited comparison.

## Explicit coverage limits

No application suite was run, because this pass authorized observation and plans. No physical mobile keyboard, Firefox/WebKit, screen reader, storage failure, multi-tab conflict, full project completion, large scientific package, rich figure/output stress, stalled dataset, late SQL boot retry, crash injection or production isolation validation was completed. The [matrix](ACCEPTANCE_MATRIX.md) preserves these gaps instead of marking an entire scenario group passed. Production Python remains a separate launch gate. These limits do not invalidate the reproducible local UI failures; they constrain how broadly a future fix can be accepted.
