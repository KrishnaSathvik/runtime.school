# SQL Studio: round-2 interaction fixes (2026-10-11)

Evidence: `round2/` (eight light/dark screenshot pairs plus workspace-ux shots), `logs/round2-*.log` (every suite against the same production build on `http://127.0.0.1:3232`).

**Scope:** Targeted interaction fixes only. No redesign sprint. Local verification only — no deploy, no push.

**Git:** Baseline commit `a83056b` (“Baseline: state after workspace UX acceptance pass (2026-10-10)”). This round is a separate changeset on top of that baseline.

## 1. Five fixes — screenshot review

| Area | What changed | Screenshot verdict |
|---|---|---|
| Mobile editor | SQL begins immediately below the toolbar; large blank gap removed | Looks fixed (`01-mobile-editor-*`) |
| Advanced questions | Relevant sample rows / jump links before nine detailed rules | Improved (`04`, `05`) |
| Database Lab | Distinguishes statements that ran, failed, or did not execute | Improved (`07`, `08`) — leave layout alone |
| Multiple-table lessons | Required tables visible; unrelated tables distinguished | Looks correct (`06`) |
| Duplicate sample-data buttons | Redundant preview actions removed | Looks fixed |

Manual watch item (not a blocker for this round): mobile compact task bar truncates the prompt (`YOUR TASK — Return the id and name of s...`). Confirm expand → return to editor without losing draft → task visible with keyboard open → Run/Check/Results not overlapping.

## 2. Automated results (same production build)

| Suite | Result |
|---|---|
| Unit (vitest) | 998/998 |
| Acceptance | 54/54 |
| Shortcuts | pass (Mac / Win / Linux) |
| Layout | 792 measurements, 0 failures |
| Sweep | 384 screens, 0 issues |
| Accessibility | 136 axe scans, 0 violations |
| Learner quality | 34/34 |
| Learning experience | 5/5 |
| V4 | 23/23 |
| Content language | 10/10 |
| V5 | 12/12 |
| Workspace UX | 4/4 |

All twelve suites passed. Logs: `docs/acceptance/logs/round2-*.log`.

## 3. Exact test modifications in this changeset

Recorded so the final report does not hide why suites still pass after UI removals.

### `tests/e2e/acceptance.mjs`
- **Before:** clicked `View sample data` to reveal rows on a Practice question.
- **After:** asserts there are **zero** `View sample data` buttons (`count() === 0`), then waits for the sample `table.results-table` that is shown by default.
- Reason: redundant preview control intentionally removed; rows are already visible.

### `tests/e2e/axe.mjs`
- **Removed** the optional click on `View sample data` in the practice-question state setup.
- Reason: same intentional UI removal; rows no longer depend on that control.

### `tests/e2e/workspace-ux.mjs`
- Observation copy: `"The sample script reached a constraint violation."` → `"The script reached a constraint violation."`
- **Added** assertions that a partial Lab failure reports:
  - outcome text matching `/Stopped at statement \d+ · \d+ earlier statements? ran/`
  - `[aria-label="What ran"]` containing Ran / Failed / INSERT
- Reason: strengthen Database Lab verification for the new per-statement feedback (ran / failed / did not run).

No other test files were edited in this round.

## 4. Source files touched (product)

- `src/components/editor/SqlWorkspace.tsx` — mobile editor / task-bar spacing
- `src/features/practice/QuestionWorkspace.tsx` — advanced task order / jump links / sample visibility
- `src/components/editor/TableInspector.tsx` — multi-table lesson presentation
- `src/app/database-lab/page.tsx`, `src/engine/sql-client.ts`, `public/vendor/engine.js` — Lab partial-run feedback
- `src/app/globals.css` — layout support for the above

## 5. Not done in this round

- Another redesign or feature sprint
- Real-device phone walkthrough of task expand / keyboard / actions (recommended next manual check)
- Deploy or remote push
- Changes to Database Lab layout beyond the statement-status feedback already shipped
