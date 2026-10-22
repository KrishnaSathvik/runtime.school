# Competitive workflow comparison

Investigation date: **2026-10-20**. The useful result is a set of workflow decisions, not a ranking of companies. Evidence is deliberately uneven: some workflows were exercised anonymously; others are documented publicly but interactive access was unavailable or not attempted.

**B — browser observed:** actual interactions reported by the coordinating investigator; evidence and capture provenance belong in [02_REA_RESEARCH_EVIDENCE.md](02_REA_RESEARCH_EVIDENCE.md). **D — documented:** inspected official product/instructor documentation or public lesson text, not a live interaction test. **U — unknown:** not established. **I — inference:** proposed lesson for runtime.school. Reading a guide does not constitute reverse engineering its implementation. No backend topology, proprietary grading algorithm or unobserved persistence behavior is inferred.

## Platform findings and primary sources

### DataCamp: distinguish instructional support from grading feedback

**D:** the instructor anatomy guide separates context/objective, instructions, sample code, requested hints, revealed solution, correctness tests and success feedback. It describes incorrect-submission feedback pointing to the affected script area, one error at a time. Revealed-answer completion is distinguished from XP credit. Its dated examples concern Python/R exercises; they do not establish the current interface for every subject. [Coding exercise anatomy](https://instructor-support.datacamp.com/en/articles/2347523-coding-exercise-anatomy) (published 2020; accessed 2026-10-20).

**B:** the public course-introduction landing exposed signup/email entry; no coding editors were observed there. This is an access-boundary observation, not an exercise test. **U:** editor completion, selection, resizing, actual Run behavior, refresh recovery, dataset browsing, mobile keyboard and accessibility were not tested. **I:** preserve separate controls for hints and checks; success feedback should explain what was learned. Adopt the distinction between supported completion and independent evidence, without copying XP or proprietary lessons.

### Exercism: test first, then submit

**D:** learners join a track and open an exercise in the online editor. Its guide places code left and instructions right; Run Tests displays results on the right, and passing tests enables submission. The guide explicitly says the editor has no integrated debugger; some tracks offer print debugging. [Using the online editor](https://exercism.org/docs/using/solving-exercises/using-the-online-editor) (accessed 2026-10-20).

**B:** the public Hello World overview exposed signup/login links; no editor was tested. **U:** no authenticated exercise was run, and live editor details, draft durability, multi-stage projects, mobile layouts and screen-reader behavior are unverified. **I:** an explicit test result is more useful than generic execution success; “debugging” must not imply step-through support when only printed output exists. Runtime.school should keep Check distinct from Run, but need not add another Submit step without a different deliverable lifecycle.

### LeetCode: separate sample execution from evaluation

**D:** the help guide documents language-specific starters, reset and last-submission retrieval, editor settings/fullscreen and a shortcut reference. Run Code uses an editable testcase and presents input, output, expected output or execution errors; Submit invokes judging and records submission history. [Start your Coding Practice](https://support.leetcode.com/hc/en-us/articles/360012016874-Start-your-Coding-Practice) (updated 2022; accessed 2026-10-20).

**B:** an ordinary browser opened public Two Sum and exposed Run, Submit and Reset controls plus login-required debugging. A separate isolated REA browser encountered Cloudflare verification; no bypass was attempted. Controls being present does not prove execution succeeded. This older guide is evidence of documented semantics, not proof of the current editor framework or exact layout. Its numerical judging claims are not independently validated here. **U:** live typing/completion/resize, refresh of unsubmitted drafts, datasets, mobile behavior and accessibility. **I:** show the input/result context of a run and keep evaluation history tied to code versions; do not import ranking pressure or interview-only problem organization into a broader learning platform.

### CodeCrafters: project continuity includes regression testing

**D:** official workflow docs describe a generated Git repository, local editing, test commits, stage instructions, test results in push output and subsequent stages in the website. This is an external-editor workflow, not evidence for a browser IDE. [How challenges work](https://docs.codecrafters.io/challenges/how-challenges-work) (accessed 2026-10-20).

**D:** its official announcement documents `codecrafters test --previous` so refactors can be checked against earlier stages; a maintainer explains earlier tests run first. [Previous-stage testing announcement](https://forum.codecrafters.io/t/codecrafters-test-previous-is-now-available/793) (2024; accessed 2026-10-20). No command was installed or executed.

**B:** the public Redis overview exposed structure/instructions and stated that membership was required for submission and solutions. No gated submission was attempted. **U:** actual test latency, terminal diagnostics quality, website refresh/milestone recovery, mobile and accessibility. **I:** a previously passed milestone is not proof that edited current files still satisfy it. Keep historical achievements, then recheck cumulative requirements at delivery. Git can be a later export/workflow option; requiring Git for beginner SQL would add unrelated setup.

### Boot.dev: assessment contracts differ even within Python

**D:** the public Debugging lesson explains Run for experimentation and Submit for additional checks. It states Run is unpenalized while unsuccessful submissions can have consequences. [Debugging lesson](https://www.boot.dev/lessons/d8ac7e89-1f92-49ac-9b9f-98644f6e57ab) (accessed 2026-10-20).

**D:** another public lesson distinguishes exact console-output tasks from unit-tested return values. It describes one editable code file for the former, and editable implementation plus read-only tests for the latter. The retrieved page explicitly says interactive features are locked pending login. [Two Lesson Types](https://www.boot.dev/lessons/3968faa9-bd13-453e-a13e-a135c57e730f) (accessed 2026-10-20).

**B:** in the public browser the Run control was disabled and a click attempt timed out; no code executed. **U:** code execution, editor mechanics, persistence, responsive layout and accessibility remain unverified. **I:** explain whether stdout or return values are graded; read-only test visibility helps debugging. Do not adopt penalties without evidence they improve this platform’s learners; distinguish technical feedback from gamification.

### SQLBolt and SQLZoo: immediate practice, with different evidence coverage

**B, SQLBolt:** on [SELECT introduction](https://sqlbolt.com/lesson/select_queries_introduction), typing `SELECT title FROM movies;` into the Ace textarea updated the result table and ticked the first task without an explicit Run. An invalid-column query produced an inline error while the earlier result table remained. Refresh restored starter text in this session. At a 390-pixel viewport the measured document width was 790 pixels. The textarea lacked an `aria-label`; this alone does not establish its accessible name or overall accessibility. These observations are scoped to this page/session, not all SQLBolt lessons.

**B via REA 6.7, SQLZoo:** on [SELECT basics](https://sqlzoo.net/wiki/SELECT_basics), the investigator entered `SELECT population FROM world WHERE name='Germany'` in `#txtar_1` and selected Submit SQL; the page displayed a Correct answer heading. Submitting `SELECT missing_column FROM world` produced SQL error and an unknown-column message. The completed scenario is recorded as `ev_298c1c8e86290f71a4a63c27efc9354e228c2f49439f1830f1e8d52a6d44bdd3`. SQLBolt success/error behavior was also captured through REA as `ev_54f7975c9a24d81a6e983521da26ca76bc5ef79c0779a78e7b16b6044ffdf2ed`. See [evidence record](02_REA_RESEARCH_EVIDENCE.md). **U:** SQLZoo completion/selection/resize, persistence, projects, mobile and accessibility remain untested. Submit SQL was exercised; a separate Run action was not established.

**I:** immediate feedback is attractive for tiny examples but silently executing every edit is a poor default for costly or state-changing activities. A retained earlier table must be clearly labeled stale; narrow-screen overflow and draft restoration need explicit acceptance tests.

### JupyterLite: cell execution is useful, persistence needs careful verification

**B:** in the public [JupyterLite demo](https://jupyterlite.github.io/demo/lab/index.html), the investigator opened a Python notebook through the launcher, ran `print(2+3)` with Shift+Enter and observed `5`; `1/0` produced a traceback. Keyboard execution created a following cell. An attempted save/reload encountered a beforeunload prompt; after accepting navigation, contents were lost. Because save completion was not established, persistence is **inconclusive**, not a demonstrated general data-loss defect.

**B, REA corroboration:** the settled R08 scenario independently captured the first-cell output and next-cell state; the exact screenshot and initialization-attempt limitation are in [02](02_REA_RESEARCH_EVIDENCE.md). The separate REA SQLBolt mobile view shows stacked main exercise content, so the earlier measured global overflow must not be generalized to every layout or attributed to a specific element without further analysis.

**D:** official documentation describes browser-local files, upload/download and notebook/editor/file-browser applications. [Using JupyterLite](https://jupyterlite.readthedocs.io/en/stable/quickstart/using.html). Its storage guide distinguishes persistent drivers from an explicitly configurable volatile memory driver. [Storage configuration](https://jupyterlite.readthedocs.io/en/stable/howto/configure/storage.html) (both accessed 2026-10-20).

**U:** autocomplete, selection, split resizing, mobile keyboard, screen readers and assessed-project grading. **I:** notebook-style labs suit exploration; fresh-run challenges should not inherit hidden cell state. Show save completion and provide explicit export. Notebook availability does not justify making every lesson a notebook.

### StackBlitz / WebContainers: engineering workspace, not a grading product

**D:** StackBlitz documents a file sidebar, editor tabs, project save/fork/share, preview and WebContainers terminal. These are engineering affordances; the inspected source does not establish learning milestones or mastery. [IDE overview](https://developer.stackblitz.com/guides/user-guide/ide-whats-on-your-screen). A dedicated [keyboard reference](https://developer.stackblitz.com/guides/user-guide/keyboard-shortcuts) exists; this is not a screen-reader audit.

**D:** WebContainers documents cross-origin-isolation requirements and differing browser support. Its page’s summary and Firefox section use inconsistent beta/alpha wording; treat non-Chromium support as requiring verification rather than promising parity. [Browser support](https://webcontainers.io/guides/browser-support) (sources accessed 2026-10-20).

**U:** no live project was edited/run, no reload recovery or mobile workspace was tested, and no learning-grade behavior was observed. **I:** introduce file tree, terminal and preview only when the task needs them. Browser support and startup requirements are architectural costs; WebContainers is not an automatic replacement for SQL/Pyodide.

## Coverage against the twelve requested workflow questions

Entries reference the platform findings above. **U is a deliberate evidence gap, not a claim that the feature does not exist.** D never implies live verification. This table prevents a documented button or marketing screenshot from being promoted into a tested workflow.

| Workflow | DataCamp | Exercism | LeetCode | CodeCrafters | Boot.dev |
|---|---|---|---|---|---|
| 1. Open lesson/problem | B public intro/signup; exercise U | B overview/login; D editor route | B Two Sum; REA verification blocked | B Redis overview; D repository stages | B lesson; interactive access blocked |
| 2. Instructions/code layout | D context/instructions/script | D code left/instructions right | D content/editor sections | D website + local IDE | D lesson text + file contract |
| 3. Type/autocomplete/select/resize | U | U | D settings/fullscreen; mechanics U | External IDE; not assessed | U |
| 4. Successful run | D success on assessment; Run U | D passing tests | D Run result | D stage pass | D documented output/test contract |
| 5. Failed run | D incorrect-submission feedback | D test result; print support conditional | D execution errors | D stage test output | D debug/test distinction |
| 6. Run versus Submit/Check | D submission tests; Run U | D Run Tests → Submit | B controls; D semantics, execution U | D Git/CLI; B membership boundary | D semantics; B disabled Run |
| 7. Tests and feedback | D focused first-error feedback | D right-side results | D result and submission history | D terminal tests | D readable tests/return contracts |
| 8. Data/schema/files | D script; dataset access U | U | D custom testcase; dataset U | D source repository | D editable/read-only files |
| 9. Navigate/refresh persistence | U | U | D last-submission retrieval; drafts U | D repository; web recovery U | U |
| 10. Projects/multiple stages | U | U | U | D stages and previous-stage checks | U |
| 11. Small screens | U | U | U | U | U |
| 12. Keyboard/accessibility | D hint shortcut; accessibility U | U | D shortcut reference; accessibility U | IDE dependent; website U | D page lists navigation keys; accessibility U |

| Workflow | SQLBolt | SQLZoo | JupyterLite | StackBlitz / WebContainers |
|---|---|---|---|---|
| 1. Open lesson/problem | B lesson URL | B SELECT basics | B launcher → notebook | D project workspace |
| 2. Instructions/code layout | B lesson/editor/table/tasks | B task textarea + feedback | B notebook cells | D sidebar/editor/preview |
| 3. Type/autocomplete/select/resize | B typing; remaining U | B text entry; remaining U | B typing; remaining U | D tabs/settings; mechanics U |
| 4. Successful run | B table and task tick | B Correct answer after Submit SQL | B stdout `5` | U live execution |
| 5. Failed run | B inline error + prior table | B SQL error/unknown column | B traceback | D console description; live U |
| 6. Run versus Submit/Check | B autoexecution on tested task | B Submit SQL; separate Run U | B execute cell; assessment U | D terminal/preview; assessment U |
| 7. Tests and feedback | B task tick/error | B correct/error feedback | B execution output, not grading | U educational grading |
| 8. Data/schema/files | B movies table | B world-table query; explorer U | D file browser/upload | D project files |
| 9. Navigate/refresh persistence | B starter restored in this session | U | D storage; B reload inconclusive | D save/fork; refresh U |
| 10. Projects/multiple stages | U | U | D notebook/files; assessed stages U | D multifile project; learning stages U |
| 11. Small screens | B 390px viewport/790px document | U | U | D browser constraints, mobile layout U |
| 12. Keyboard/accessibility | B typing; accessible name unproven | U | B Shift+Enter; accessibility U | D keyboard reference; accessibility U |

## What the comparison settles—and does not settle

**Proposal:** choose distinct editorial, challenge and project compositions on shared editor/runtime/results/persistence components. The examples reveal different intents: an adjacent tiny runnable lesson, explicit problem evaluation, continuous project regression and open-ended notebook/IDE exploration. This is a design inference, not an experimentally established winner. Runtime.school’s own existing lesson, practice and stage-project implementations provide stronger compatibility evidence than copying any competitor layout wholesale.

| Decision | User problem and evidence | Alternative / tradeoff | Compatibility, complexity, priority |
|---|---|---|---|
| Explicit Run and Check | Exercism, LeetCode and Boot.dev document distinct experimentation/evaluation semantics; runtime.school already separates them. | Auto-run is faster for tiny examples but obscures cost/state and can blur completion. | Preserve current behavior; low-medium; now. Optional auto-run only for bounded examples later. |
| Label stale output and graded source | SQLBolt retained a prior table after an error; current Python Workbench also keeps reports separately from drafts. | Clearing everything avoids ambiguity but loses useful comparison context. | Keep earlier result with revision label; medium; next. |
| Cumulative project verification | CodeCrafters documents prior-stage regression checking; runtime.school already has shared project files and SQL evidence. | Summing historical passes is cheaper but says little about current deliverable. | Preserve historical achievements, verify current snapshot; medium; next. |
| Save-state feedback and export | JupyterLite storage is configurable and this reload experiment was inconclusive; local runtime.school drafts are valuable. | Assuming autosave always succeeds hides quota/network/configuration failure. | Reuse SQL save-failure signal; extend parity; medium; now/next. |
| Progressive workspace complexity | JupyterLite cells and StackBlitz file/terminal/preview solve different work than small exercises. | One giant IDE imposes navigation/boot overhead; fully separate products repeat behavior bugs. | Shared primitives, specialized composition; medium; next. |
| Mobile and accessibility remain acceptance work | One measured overflow and several untested products do not establish a market-wide best pattern. | Copying a desktop screenshot offers no keyboard/screen-reader assurance. | Test runtime.school’s proposed layouts directly later; medium; required before broad release. |

The research does **not** establish best autocomplete behavior, splitter ergonomics, mobile keyboard handling, screen-reader parity or reliable refresh behavior across all platforms. Next authorized investigations should use the same success/error/stale-edit/save/reload/mobile/keyboard scenario per target, with access limits recorded. Do not fill those gaps with presumed competitor capabilities or use them to justify an editor replacement.
