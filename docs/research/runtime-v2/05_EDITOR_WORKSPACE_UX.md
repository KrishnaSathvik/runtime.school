# Editor and workspace UX specification

Research date: **2026-10-20**. This is a design specification, not an implemented frontend. **Verified findings** below come from local source inspection or primary documentation. Wireframes, behaviors and acceptance criteria are **proposals** unless explicitly described otherwise. No local browser interaction, device testing, benchmark or production verification is claimed by this document; see [REA evidence](02_REA_RESEARCH_EVIDENCE.md) for separately captured observations and limitations.

## Recommended decision

Use **three purpose-specific workspace compositions over shared foundations**, retaining CodeMirror 6 for SQL and Python:

- **A: Editorial lesson** — readable explanations, contextual runnable examples and focused checks.
- **B: Coding challenge** — task, editor, inputs/schema, output and assessment feedback.
- **C: Project engineering** — brief, milestones, persistent source, evidence and deliverables.

A single giant adaptive component would accumulate lesson, challenge, notebook and project conditionals. Independent editors/runtime controllers would duplicate recovery and accessibility behavior. Share the editor primitives and lifecycle controller; specialize composition and activity policy. Notebook execution is a later capability for appropriate labs, not the mandatory interface for learning SQL or beginner Python.

## Current source evidence

| Verified finding | Source and relevant symbol | Design implication |
| --- | --- | --- |
| Both subjects already use CodeMirror 6 and a shared editor theme. | [`package.json`](../../../package.json), [`Editor`](../../../src/features/rt/Editor.tsx), [`PyEditor`](../../../src/features/py/PyEditor.tsx), [`editor-theme.ts`](../../../src/components/editor/editor-theme.ts) | Keep the installed editor family; no demonstrated replacement requirement. |
| SQL completion uses SQLite dialect and the provided dataset schema; typing-triggered suggestions turn off on coarse pointers. It labels the editor and maps Mod+Enter / Shift+Mod+Enter to Run / Check. | `Editor`, `useActivateOnTyping` in [`Editor.tsx`](../../../src/features/rt/Editor.tsx) | Preserve dataset-aware completion and touch-aware behavior; make completion manually available too. |
| Python has 4-space indentation, labeled content, error-line decoration clearing on document edit, Escape/Tab focus escape, imperative focus and transactional replacement. | `PyEditor`, `setErrorLine`, `PyEditorHandle.replaceAll` in [`PyEditor.tsx`](../../../src/features/py/PyEditor.tsx) | Reuse these mechanisms for reset/undo and error navigation. The source comment specifically warns delayed controlled-value resets can overwrite newer typing. |
| Python Workbench already has file tabs, Run/Stop/Check/Reset, console/check/file/table/chart/error views and stack/column layouts. Run and Check are separate operations. | [`Workbench`](../../../src/features/python/Workbench.tsx) | A reusable workbench is already present; extract only proven common responsibilities. |
| SQL project UI maintains stage/reference views and uses run generation guards. Project evidence detects changed query text. | [`ProjectWorkspace`](../../../src/features/rt/projects/ProjectWorkspace.tsx), `currentEvidence` and `isEvidenceStale` in [`evidence.ts`](../../../src/features/rt/projects/evidence.ts) | Extend snapshot provenance consistently; do not claim stale-evidence handling is entirely absent. |
| Python playground persists bounded files, selected file and dataset locally; writes report failure through a boolean. | `Workspace`, `readWorkspace`, `writeWorkspace`, `nameProblem` in [`workspace.ts`](../../../src/features/python/workspace.ts) | Preserve working drafts; distinguish file validation/storage errors from runtime errors. |
| SQL lesson rendering and progress hydration are separate, with saved stage restoration. | `Session`, `idealTab` in [`Lesson.tsx`](../../../src/features/rt/pages/Lesson.tsx) | Render readable content promptly, but do not overwrite user input when saved state finishes loading. |

**Unknown:** installed integration behavior with VoiceOver, NVDA, IME composition, mobile keyboards, zoom, very large outputs and multi-tab editing. Existing source and test filenames do not establish successful current execution of those scenarios. This research did not run builds or tests.

## External framework evidence

Sources accessed **2026-10-20**. These are documented capabilities, not runtime.school compatibility certifications.

| Source | Verified statement | Interpretation for V2 |
| --- | --- | --- |
| [CodeMirror official website source](https://raw.githubusercontent.com/codemirror/website/main/site/index.html) | Documents modular extensions, accessibility, native phone selection/editing, autocomplete and undo. Direct codemirror.net fetch returned 403; official source was used instead. | Strong fit with the existing small editors; mobile claims still require integration testing. |
| [CodeMirror official Tab handling example](https://raw.githubusercontent.com/codemirror/website/main/site/examples/tab/index.md) | Default does not bind Tab; when indentation binds it, Escape then Tab provides an exit, which integrators should document. | A visible keyboard-help affordance is part of the product, not an assumption that users know an editor shortcut. |
| [Monaco official README](https://github.com/microsoft/monaco-editor) | Models represent files with URIs, edit history and language providers; README explicitly states mobile browsers/frameworks are unsupported. VS Code extensions do not generally work automatically. | Attractive for sophisticated desktop language services, but not a justified platform-wide replacement. |
| [Monaco accessibility guide](https://github.com/microsoft/monaco-editor/wiki/Monaco-Editor-Accessibility-Guide) | Documents keyboard command access, Tab trapping toggle, screen-reader behavior and diagnostics navigation. | Accessibility exists in both candidates; choose based on tested embedding, not a blanket claim that Monaco is inaccessible. |
| [JupyterLab notebook documentation](https://jupyterlab.readthedocs.io/en/stable/user/notebook.html) | Notebook documents mix narrative, code and rich output; edit and command modes and cell operations are distinct. | Useful for exploratory data work, but introduces modes and kernel-state concepts that simple exercises do not need. |
| [W3C APG Window Splitter](https://www.w3.org/WAI/ARIA/apg/patterns/windowsplitter/) | Describes keyboard-resizable separators with accessible names and values; the page explicitly notes its incomplete example/review status. | Use as interaction guidance, then validate against assistive technologies; do not treat following the pattern as proof of conformance. |
| [W3C understanding Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html) | Focused components must not be entirely obscured by author-created content. | Sticky controls and overlay panels require deliberate focus visibility checks; target fully visible focus where practical. |

### Options and tradeoffs

| Option | Usability / correctness | Maintenance / performance / cost | Decision |
| --- | --- | --- | --- |
| Keep CodeMirror, separate A/B/C compositions | Familiar existing behavior; fits inline and file editors; execution remains adapter-owned | Reuse installed code and themes; extension/configuration consistency needs ownership. No bundle-size benchmark was run. | **Now** |
| Replace all editors with Monaco | Rich file/provider model and documented accessibility; unsupported mobile is material | Migration, worker setup, theming, shortcuts and mobile alternative require work; no measured gain here | Reject for current V2; reconsider only for demonstrated desktop language-service requirements |
| Make every activity a notebook | Natural narrative + outputs; state/order can confuse novices and reproducibility | Kernel session model, cell identities, export, dependency invalidation and trust handling add complexity | Later for specific exploratory labs |
| One universal configurable shell | Consistent appearance, but many special cases and heavy lesson chrome | Initially fewer files; later configuration interactions grow | Reject as the top-level architecture |
| Separate implementations per subject | Subject freedom | Duplicated draft/recovery/focus defects and divergent controls | Reject; specialize adapters and subject panels instead |

## Shared foundations and specialized responsibilities

**Proposal:** shared `EditorSurface` behavior means document identity, selection, undo, accessible name, theme, key bindings and language configuration. It does not mean one global editor instance. Switching a file restores that file's document/view state; hiding a panel must not destroy its draft.

Shared workspace responsibilities:

- **Controller:** immutable execution snapshot, run ID, cancellation, capability/readiness state, stale-result detection and command availability.
- **Results:** renderer registry for text, tables, diagnostics, tests and artifacts; consistent summaries and recovery actions.
- **Data access:** dataset identity/version, schema, relationships, previews and read-only fixture files.
- **Persistence:** draft save/hydration status, activity/content revision, selected file/panel and recoverable checkpoints. Keep progress awards separate from draft persistence.
- **Accessibility:** focus routing, announcements, keyboard help and responsive pane navigation.

Specialized composition:

| Model | Special behavior | Avoid |
| --- | --- | --- |
| A | Blocks in reading order, local example execution, concept checks, related practice links | Persistent IDE file tree or a full-height console before a learner runs anything |
| B | Public inputs, submitted snapshot, visible test feedback, assistance and independent-solve status | Mixing sample success with assessed completion |
| C | Milestones, cumulative file state, checkpoint history, evidence/findings, artifact export | Pretending every milestone needs a new editor or every project needs multiple files |

Execution adapters define whether tables, streams, files, plots, selection runs, debugging, cancellation or stateful sessions exist. Hide unsupported commands and explain relevant limitations in context. A simulated future tool must be labeled as a simulation; the UI cannot erase runtime differences.

## Annotated layout specifications

**Proposal:** dimensions are starting hypotheses, not measured usability thresholds. Choose layouts by available content width and height, not user-agent labels. Approximate design cases: desktop 1280×800, tablet 820×1180 or 1180×820, phone 390×844; verify also narrow 320px and zoomed layouts. Minimize nested scrolling. Tables/code may scroll inside labeled containers; surrounding instructions reflow.

### Model A — editorial lesson

Desktop:

```text
[Subject > Learn > Lesson]                       [Saved on this device]
[Local outline]  | [Title / objective / prerequisite links]       [Data]
                | [Concept: readable text measure]
                | [Predict: response before Run]
                | [Worked example editor               Run]
                | [Actual output, directly below example]
                | [Try / independent challenge      Run Check]
                | [Concept check] [Continue to practice]
```

Outline supports resuming without breaking the reading flow. Data is a compact inspector, opened on demand. Inline output maintains cause/effect proximity. Optional challenge expansion can provide more space without converting all explanatory blocks into IDE panes. Existing lesson content maps into this composition without editorial changes.

Tablet:

```text
[Back / lesson title] [Outline] [Data]
[Concept and objective -- full readable width]
[Predict / worked example]
[Editor                                      Run]
[Output]
[Challenge                                   Check]
[Next activity]
```

Use one column in portrait. In sufficiently wide landscape, an optional data drawer can sit beside the current exercise; required explanations remain in document flow. Opening a drawer returns focus to its trigger when closed.

Mobile:

```text
[Back] [Lesson title] [Contents]
[Objective / concept]
[Dataset summary] [Inspect data]
[Example code]
[Run] [Show output]
[Challenge editor -- Expand]
[Run] [Check] [Help]
[Feedback summary]
[Continue]
```

Do not force a phone learner to alternate through four tabs just to read a short example. “Expand” temporarily dedicates space to editing; “Back to lesson” restores reading position and caret. Long output collapses after a summary with a deliberate expand control.

### Model B — coding challenge

Desktop:

```text
[Subject > Practice > Problem]          [Draft saved] [Keyboard help]
+--------------------------------+----------------------------------+
| Problem / examples             | query.sql or main.py    [Expand] |
| Requirements / output contract | Editor                            |
|                                |                                  |
| [Description | Schema/Files]    | [Run] [Check] [Reset] [Hint]        |
+--------------- splitter -------+----------------------------------+
| Public input / dataset version | [Output | Tests | Errors | Files] |
| related skill links            | Run summary + contextual detail   |
+--------------------------------+----------------------------------+
```

Left pane keeps the contract visible; right pane optimizes the edit/run loop. Result tabs only appear when meaningful. One clear primary Check action evaluates; Run explores. Separate output and assessment labels prevent “ran successfully” being read as “correct.” Provide collapse/expand presets as well as drag resizing.

Tablet:

```text
[Problem title] [Saved] [Task / Data toggle]
[Problem or data panel -- collapsible]
[File tabs]
[Editor]
[Run] [Check] [Reset] [Help]
[Output | Tests | Errors]
[Selected result]
```

Portrait stacks the brief above code; landscape may use the desktop two-column form when each pane remains usable. Keep the last selected task/data panel and editor selection. No draggable splitter is required for portrait touch use.

Mobile:

```text
[Problem title] [Saved / Unsaved]
[Task] [Code] [Results (status)] [Data]
[Selected panel; one main vertical scroll region]
  Code: file selector / editor
  Results: summary / output or tests / error navigation
[Run] [Check] [More]
```

Task is the initial panel for a new activity; resume Code only for a saved in-progress activity with clear task access. Run leaves typing focus in place and updates the Results badge. “View results” moves focus intentionally. If Check was invoked from a results workflow, keep that panel; do not unexpectedly dismiss the keyboard merely because a background operation finishes.

### Model C — project engineering

Desktop:

```text
[Project title] [Current milestone] [Saved] [Checkpoint] [Export]
+------------------+----------------------------+-------------------+
| Milestones       | File tabs / current source | Brief / criteria  |
| Files (if needed)| Editor                     | Dataset / schema  |
| Data (read only) |                            | Findings / notes  |
+------------------+----------------------------+-------------------+
| [Run entry] [Check milestone] [Check project] [Stop while running] |
+-----------------------------------------------------------------+
| Output | Tests | Artifacts | Evidence       [runtime / run status]|
+-----------------------------------------------------------------+
```

Files appear only for file-oriented projects; SQL investigation projects use named queries/evidence instead. Separate “Check milestone” from cumulative “Check project.” Export describes what is included. Findings support interpretation, while artifacts capture executable/generated deliverables. The initial screen is a brief with requirements and Start/Resume, not an unexplained empty IDE.

Tablet:

```text
[Project] [Milestone picker] [Saved]
[Brief / Files / Data / Evidence drawer trigger]
[File or query tabs]
[Editor]
[Run] [Check milestone] [More: Check project / Export]
[Output / Tests / Artifacts]
```

A drawer replaces the simultaneous sidebars; landscape permits one pinned reference pane. The milestone picker shows completed, current and needs-recheck states using text/icons, not color alone.

Mobile:

```text
[Project] [Milestone 2 of N] [Saved]
[Task] [Files] [Code] [Results]
[One selected pane]
[Run] [Check] [More]
More: Data, Evidence, Checkpoint, Check project, Export
```

Show small-screen constraints honestly for large projects, but allow inspecting instructions, editing, saving and exporting wherever supported. Do not claim a full debugger exists on mobile merely because a toolbar can fit. Keep milestone switching in Task; preserve source and caret across panels.

### Mobile keyboard-visible behavior (all models)

```text
[Compact activity header] [Back to task]
[Active editor, caret kept visible]
[Run] [Check] [Indent] [Outdent] [Results status]
---------------- OS keyboard ----------------
```

**Proposal:** the action row occupies available visual viewport space and must not cover the caret. Avoid fixed full-screen heights that ignore viewport shrinkage. The OS keyboard itself is not author-created content, but app overlays must not obscure focus. No automatic horizontal panes, focus jumps, pinch-zoom suppression or forced autocomplete popup. Respect native selection handles, paste and IME composition; save composition results without dispatching Run on composition keystrokes. Hardware-keyboard users retain shortcuts and a documented escape from indentation trapping. These require real iOS/Android testing later; a resized desktop browser is insufficient.

## Full lifecycle state specification

**Proposal:** runtime readiness, draft persistence, execution and assessment are orthogonal state dimensions. Do not encode everything as one `loading` boolean. Each run stores a code/files fingerprint, dataset/fixture revision, runtime identity and run ID. Historical progress is retained even when a new draft is unverified.

| State / trigger | Visible behavior | Allowed action / focus / persistence |
| --- | --- | --- |
| Initial load | Render title, requirements and readable content; show restoration status separately | No automatic focus stealing. Never initialize an empty draft over saved data before hydration resolves. |
| Editor loading | Preserve code/read-only fallback and reserve editor space; name the unavailable control | Copy/read remains available; editing starts after editor hydration. A failed editor chunk gets Retry, not a blank task. |
| Engine loading | “Preparing Python / loading dataset” with meaningful stage; progress percentage only if measured | Editor and instructions remain usable. Run/Check disabled with explanation; Cancel/Stop remains available when a requested operation is preparing its engine, packages or dataset. No hidden repeated run queue. |
| Editing | Saved/unsaved indicator; completion uses actual language/schema | Preserve caret, selection and undo. Diagnostics from older source become stale or clear. |
| Running | Run ID/status, elapsed time, Stop if supported; bounded streamed output | Capture snapshot on invocation. Editing may continue; duplicate Run/Check disabled while one execution owns the session. Preserve typing focus. |
| Successful execution | “Ran successfully” plus stdout/table/artifacts and snapshot label | Does not award completion. Check remains available when applicable. Empty output explicitly says no output. |
| Syntax error | Error type/message and available file/line; no grading claim | “Go to line” focuses correct file/position on request. Preserve draft and prior result history. |
| Runtime error | Exception or execution diagnostic and relevant public context | Separate from syntax and incorrect answer. Keep partial output labeled incomplete. |
| Incorrect result | “Check did not pass”; actionable public mismatch category | Keep submitted output, expected public contract and retry/hint controls. Record failed assessment only when grading actually completed. |
| Passing test | Individual pass plus aggregate check status and assistance label | A single public case is not full completion. Award only when required assessment finishes for its snapshot. |
| Failing hidden test | “Additional cases did not pass”; safe invariant/category where allowed | Never expose hidden fixture/answer. State whether tests are client-visible; do not falsely promise secrecy. Offer a public debugging example where available. |
| Timeout | “Stopped after the execution limit”; show applicable budget and partial output | No automatic infinite retry. Offer edit/retry; if environment was restarted, disclose loss of transient state. No infrastructure-timeout mastery penalty. |
| Cancelled execution | “Stopped”; partial output labeled incomplete; no pass/fail badge | Stop acknowledgement ends the run; ignore late results for awards. Keep code. Restore Run only when adapter is ready or reset completes. |
| Worker crash | “Runtime stopped unexpectedly. Your code is saved/unsaved.” | Retry preparation or restart environment; never replace source with starter. Preserve actual save status, not an unconditional assurance. |
| Offline / unavailable runtime | Explain unavailable dependency/runtime; distinguish cached local execution from missing downloads | Continue editing/export. Retry when appropriate. Offline does not imply all cached engines fail, nor does local execution guarantee offline assets. |
| Code changed after successful run | “Results from previous code”; retain old result with source snapshot | Clear current verified badge; historical achievement remains. Recheck current draft before attaching evidence or completion to it. |
| Reset and undo | Reset restores starter for chosen file/activity; offers Undo | Use an editor transaction, not delayed value replacement. Project-wide reset names scope and requires deliberate confirmation/checkpoint; reset never erases assistance/progress history. |
| Browser refresh | Restore saved files, active file and location; label previous run output as historical | Do not resume a browser worker or silently rerun code. If a run was interrupted, show that fact and offer Run. |
| Reopened unfinished activity | Resume last workspace/step with brief context and saved timestamp | Read content revision; preserve mismatched old drafts as recoverable copies, not discard them. No auto-run. |
| Mobile keyboard visible | Compact editor and actions in available viewport; status badge for results | Keep caret/focus visible; no completion-driven panel jump. Preserve native typing and selection behavior. |

Additional essential states: save failure exposes “Unsaved—export or retry” while retaining memory contents; multi-tab newer drafts prompt comparison/recovery rather than silent last-write wins; output-limit reached distinguishes truncation from an empty result; content-version changes distinguish historical work from current requirements. The latter protections are proposed acceptance criteria, not claims about all existing stores.

### Race and provenance rules

A late result can update only its own run record. It cannot overwrite the current draft, clear a newer error, attach a stale artifact to a milestone, or award a second completion after cancellation. If the learner edits while Check runs, the checked snapshot may earn historical evidence but the current editor still says “Changed since check.” Dataset/fixture changes invalidate current-result equivalence even if source text is identical.

Reset source, restart runtime and reset dataset are three different actions. A stateful future lab must explain which state each resets. Lessons and ordinary checks default to reproducible fresh execution; project cumulative state is rebuilt from saved source and fixtures. A notebook lab must additionally display execution order and provide Restart + Run All before reproducibility assessment.

## Results, completion and diagnostics

**Proposal:** completion suggestions are local assistance, not semantic validation. SQL suggests actual relevant tables/columns and dialect keywords. Python syntax/language suggestions must not imply a package is installed; runtime/package capabilities appear in the input context. Manual completion stays available when typing-triggered popups are suppressed. Never advertise LSP-grade Python type checking merely because syntax highlighting exists.

Run the full active program by default. If selection execution is supported, expose an explicit “Run selection” action with the selected scope; Check always assesses the declared complete submission. File-based projects name the entry file because an active helper tab may not be the runnable entry.

Results begin with status and a short summary, then detail:

- Tables show row/column count, null representation, truncation and ordering semantics; accessible headers and keyboard-scroll containers. Pagination/virtualization must not imply the displayed subset is the complete graded result.
- Text streams separate stdout/stderr where meaningful, bound retained output and provide copy/export. Do not announce every streaming token through a live region.
- Diagnostics retain raw error text with an optional explanation and explicit jump-to-source. No automatic claim that a suggested fix is certainly correct.
- Tests show public contract, passed/failed/not-run/error status and assisted context; grading-system failure differs from learner failure.
- Artifacts show filename, type, size and producing run. Untrusted HTML is not inserted directly into the app DOM; use safe rendering/download boundaries as described in the execution specification.

## Accessibility and keyboard contract

**Proposal:** target WCAG 2.2 AA and verify actual workflows; library selection alone is insufficient.

Keep a clear document reading order: title/requirements → code/actions → results, even if desktop grid changes visual placement. Label each editor by activity and filename; label schema tables, output and test summaries. Use text plus symbols for result states. On a completed run, announce a concise status without moving focus. An explicit “View errors” or “Go to line” may move it; closing drawers restores the initiating control. Dialogs contain focus only while open and support dismissal appropriate to their action.

Preserve current Mod+Enter Run and Shift+Mod+Enter Check, with visible buttons and OS-aware labels. Document Escape then Tab wherever Tab indents; test Shift+Tab exit too. Respect editor search, selection and OS/browser shortcuts. Avoid global single-letter shortcuts outside an explicit mode. Provide keyboard resize controls and preset widths; drag is not the only way to resize. Separator name/value must be exposed, while collapsed panels leave a visible restoration control.

Unknowns to resolve with people and devices: screen-reader verbosity during tables/streams, zoom at 200% and 400%, high contrast, reduced motion, touch selection and alternative input methods. A basic textarea/copy/export recovery surface is a fallback proposal for editor failures, not a claim of equivalent IDE functionality.

## Decisions, scope and future validation

Complexity: **S** contained presentation change, **M** shared behavior across surfaces, **L** new stateful environment or major migration; not calendar estimates.

| Decision | Problem / evidence | Alternative and tradeoff | Compatibility / complexity / phase |
| --- | --- | --- | --- |
| Three compositions, shared controller/primitives | Source already distinguishes lessons, Workbench and projects | Universal shell reduces initial files but hides activity intent; separate engines duplicate bugs | Incremental wrappers around current SQL/Python; M, Now contract / Next extraction |
| Retain CodeMirror | Installed in both subjects; mobile-aware SQL and transactional Python editor behavior | Monaco adds desktop provider model but requires migration and unsupported-mobile workaround | Preserve existing keybindings/themes; S, Now |
| Explicit execution vs assessment vs save state | Existing Run/Check split; project stale evidence | One success badge is simpler but misleading | Keep grading semantics and normalize presentation; M, Now |
| Immutable snapshot provenance | Existing generation guards/evidence fingerprinting | Clearing all results on every edit loses useful debugging context | Extend to all files, dataset and runtime; M, Next |
| Phone-specific panels and keyboard handling | Existing coarse-pointer completion; framework and W3C guidance | Shrinking desktop split panes leaves insufficient editing space | Preserve desktop workflows; M, Next; device evidence required |
| Checkpoint/export and recovery | Existing local workspace and SQL evidence persistence | Accounts/cloud sync add scope and do not solve local race behavior | Local-first continuity; M, Next; synchronization Later |
| Notebook-specific labs | Jupyter documents cells/modes; exploratory data use plausible | Notebook everywhere adds hidden state to simple tasks | Capability-specific later workspace, same foundations; L, Later |

Future acceptance scenarios (not executed here): type while runtime loads; edit during Check; Stop immediately before completion; switch files while an error arrives; reset then undo while typing; navigate away and return; refresh during execution; fail local storage writes; reopen old-version drafts; use native IME/paste/selection on iOS and Android; keyboard-only resize/close drawers; inspect a large table with a screen reader. Each must preserve source, avoid incorrect awards and leave a recoverable next action.

Before an editor migration, require measured failure of the retained approach on a necessary capability, plus representative bundle/load/input-latency, accessibility and mobile comparisons. Before notebook delivery, require explicit session/restart/export/trust semantics. Before Python launch, require the execution isolation gate in [execution architecture](06_EXECUTION_ENGINE_ARCHITECTURE.md); a polished editor does not establish a safe runtime.

Related: [learning model](04_LEARNING_MODEL.md), [grading](07_GRADING_SYSTEM.md), [progress](09_PROGRESS_AND_SKILLS.md), [roadmap](11_MIGRATION_AND_ROADMAP.md).
