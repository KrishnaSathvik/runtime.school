# SQL Studio: workspace UX acceptance report (2026-10-10)

Evidence: `before/` (production build before this pass, 1440×900 light), `after/` (final build, light + dark at 1440×900, phones at 390×844, populated states), `logs/` (every suite run against the final build), `after/evidence-log.json` (measured geometry and verdict text).

**Method note:** `sqlstudio/` has no git history (it sits untracked inside the home-directory repo) and no file backups of the previous pass exist. There is therefore no source diff of the earlier claimed changes. The "before" state is the rendered production build captured before this pass started.

## 1. Verifying the previous completion claims

| Claim | What the build showed (before/) | Verdict |
|---|---|---|
| Visible task requirements | Task, required columns and first-table sample rows were visible. On the advanced question, case-study chrome took 335px before the task, and data sat below 8 rules. | Partial |
| Larger, resizable editor | Editor height came from a CSS `clamp()` (396px). Results was a 140px strip at y=706–843 in a 900px window, below the fold on the advanced question. Resizing used the browser's corner grip. | Not met |
| Three-step projects | Three tabs existed. Step 1 showed deliverables and real data, but the business question was a single sentence and "Write and check SQL" sat at the bottom of a 1,657px page. | Partial |
| Clearer SQL tools | Playground, Lab and Performance opened with empty Results. Performance showed one-line SQL. Syntax was a dropdown plus three snippets. | Not met |
| Compact header | A 44px bar holding only a search icon remained on every page. | Not met |
| Wider Settings | 1100px and left-aligned, so it sat off-grid from the 1240px centred pages at wide widths. | Not met |
| 998 tests passed | Unit tests passed. On the same build 7 acceptance checks, the shortcut, layout, a11y, language and v5 suites, and the previous pass's own `workspace-ux` test all failed. That last test could never pass: it looked for a "Dark" button that was rendered as "dark". | Not a valid UX claim |

## 2. Requirement → problem → change → evidence → outcome

| Requirement | Original problem | Change | Evidence | Outcome |
|---|---|---|---|---|
| Editor 350–450px, Results visible and integrated | 140px Results strip, often off-screen | Desktop coding pages are one fixed-height frame. The task pane scrolls on its own; editor and Results share the height via a divider (drag, keyboard, double-click to reset, remembered). Run/Check can't be pushed off screen. | Editor 374–404px. Results starts at y≈607–629 with 271–293px visible on lesson, Practice, advanced and milestone screens. Page height = viewport. | **Met** |
| Distinct feedback | Error, wrong and correct looked alike apart from body text | A verdict badge in the Results header: SQL error / Not correct yet / Correct on sample data only / A requirement is not met / Correct · progress saved / Ran · N rows · not graded | `03a–03d`, `02`, `06`, `08` light/dark | **Met** (requirement-not-met is covered by grading logic but has no screenshot) |
| Run vs Check purposes | Same-looking pair | Action bar text: "Run query shows your output · Check answer grades it and saves progress", plus button tooltips | All workspace shots | **Met** |
| Task, columns and tables visible | Required columns below long rules; tall headers | One-row header. Order is task → "Uses <tables>" jump links → columns to return → rules → tables with sample rows → expected output. Duplicate column lists removed. | `03*`, `04` | **Met** for beginner and independent questions. **Partial** for long advanced tasks: you still scroll the task pane, or use the jump link, to reach the sample rows. |
| Milestone: understand → write → finish | Thin business context; CTA buried | Step 1 opens with a business-question block (milestone objective + project goal), deliverables, "How the tables connect" (`watch_events.viewer_id → viewers.id`), sample rows, approach, a runnable example, and a pinned "Write and check SQL". The coding step shows the business question with a link back. Challenges, concept check, credit, notes and order are unchanged (v5 and acceptance project tests pass). | `05`, `05b`, `06` | **Met** |
| Playground | Empty Results on open | Starter query runs automatically on open and on database change | `07`: "Ran · 8 rows" | **Met** |
| Database Lab | Dropdown plus one hint line | All 7 experiments as a visible list. Each shows What it teaches / What to run / What you should see. Auto-runs, with an observation line in Results. | `08`: duplicate tag → UNIQUE error, explained | **Met** |
| Query Performance | Two SQL snippets until clicked | Plans run on open. A summary table compares access method, index in plan, rows, and output equivalence, all read from the real EXPLAIN output. SQL is formatted with setup and query separated. Output trimmed to 5 rows. | `09`: SCAN through idx_time vs SEARCH idx_time, 25 = 25 rows, identical | **Met** (only 2 comparisons exist in content) |
| Compare SQL Syntax | Dropdown and three fragments | All 11 concepts as a visible list with search. "What is different" sits above the code. The SQLite version runs live and shows its output, with a link to try it. | `10` | **Met** |
| Header | Search-only 44px bar | Desktop bar removed. Search is in the sidebar with the shortcut shown; ⌘/Ctrl+K unchanged. The phone top bar is kept. | All desktop shots | **Met** |
| Settings | Off-grid | Same grid as other pages; section contents capped at 760px. Theme buttons have real "Light/Dark/System" labels. | `11` | **Met** |
| Mobile Practice | — | Editor 300px. Run/Check visible while typing; Results below. | `12a–d` | **Partial**: about 60px of empty space above line 1 in the editor (older sticky-bar padding rule) |

## 3. Automated results (final production build, single binary)

| Suite | Result |
|---|---|
| Unit (vitest) | 998/998, plus lint and typecheck clean |
| Acceptance | 54/54 (was 47/54) |
| Shortcuts | pass |
| Layout | 792 measurements, 0 failures |
| Sweep | 384 screens, 0 issues |
| Accessibility | 136 axe scans, 0 violations |
| Learner quality | 34/34 |
| Learning experience | 5/5 |
| V4 | 23/23 |
| Content language | 10/10 |
| V5 | 12/12 |
| Workspace UX | 4/4 |

**Test edits (review these):**
- **Stale tests:** "Write and test SQL" → "Write and check SQL"; "View sample data" clicks removed because the rows are shown by default; the shortcut hint moved from the top bar to the sidebar.
- **Dropdown → visible-list selectors:** Lab, Syntax, Performance.
- **Settings check:** the 721px cap was replaced by grid alignment plus a 760px control width.
- **Resize test:** now drags the divider and asserts that Run/Check and Results stay visible.
- **v5 milestone heading:** now targets the Business question region.

## 4. Not performed

- Real-device phone testing.
- Screen reader walkthrough.
- Hands-on learner session.
- Short-window desktop (<600px tall), which falls back to page scrolling and was not visually reviewed.

## 5. Remaining UX issues

1. Mobile editor: about 60px of empty space above the first line.
2. Long advanced tasks: sample rows sit below the rules in the scrolling task pane.
3. Lesson secondary tables are still collapsed sections (the primary table is open).
4. "View sample data" still appears on some Practice tables whose rows are already shown.
5. A Lab constraint failure is labelled "SQL error · the query did not run", although earlier statements did run. The observation line explains it; the label is imprecise.
