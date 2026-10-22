# Workspace & Engine Stabilization

This repair builds on the existing [workspace investigation](../workspace-quality/WORKSPACE_AUDIT.md). It preserves the dirty working tree captured in [BASELINE.json](BASELINE.json), rather than treating HEAD as the starting point. No deployment, dependency installation, application configuration change, curriculum revision or progress migration is part of this repair.

## Implemented behavior

- Cancelled SQL startup cannot create late orphan retries. Python stalled dataset preparation has a separate 60-second deadline and supports immediate retry after Stop.
- Python execution has an owner. Superseded work settles in its original UI; Stop and unmount cleanup cannot cancel another owner's work. SQL retains latest-run-wins with clearer interruption feedback and a synchronous duplicate-shortcut guard.
- Python file editors preserve their own history and selection. Reset is undoable; milestone reset explicitly names its scope and offers Undo Reset. Traceback navigation selects the actual source file and line.
- Old Python checks become “Previous check — code changed” after edits, while earned credit remains. SQL feedback receives full actual/expected row counts without changing comparisons or preview caps.
- Answer confirmation uses a focus-managed dialog. Locally requested Hint/Answer content receives focus; restored assistance history does not steal focus. Prior check feedback remains available.
- The six lesson/practice/project surfaces use independently scrollable 50/50 panes: side by side on desktop, stacked on mobile. Constrained editor focus and short-height fallback preserve room to edit. Tool workspaces retain their layouts. SQL question navigation supports Escape and returns focus to its trigger.

## Evidence and release limits

**Validation:** 285 tests passed across 17 suites; six learner journeys, 30 viewport cases, six Axe scans, assistance/navigation checks and final ownership/preparation browser checks passed. All 812 frozen files match. Independent reviews approved each local repair batch.

Batch evidence is recorded in [VERIFICATION_LEDGER.md](VERIFICATION_LEDGER.md). Browser scripts use isolated Chromium contexts against the existing local server; viewport simulations do not establish physical-device or on-screen-keyboard compatibility. Automated Axe checks do not substitute for a complete assistive-technology audit.

All 812 frozen content, dataset, grading and progress contract files are checked by [verify_frozen.py](verify_frozen.py). The SQL worker exemption permits only the additive expected-count response metadata, not comparator changes. Existing reference solutions are used only as browser test inputs.

The full TypeScript check had a pre-existing error in `src/content/python-v2/projects/step.ts:29`. On 2026-10-21 the owner approved a type-only fix (the `milestone()` parameter `id` is now typed `PyMilestone["id"]`); its frozen record keeps the original hash as `original_sha256` (see [VERIFICATION_LEDGER.md](VERIFICATION_LEDGER.md)). `tsc --noEmit` is now clean. Two approved lint-only fixes (frozen `M15.ts` and `Project.tsx`) let `next build` pass. An approved fix makes the order-dependent `PY-L38-02` c2 check deterministic, and two test-harness fixes make the full suite pass three consecutive runs (see the ledger). Real-device mobile testing and Python production isolation remain mandatory release gates; no production readiness claim or deployment is made here.

## Rollback boundary

The ignored `snapshots/pre-repair.tar.gz` preserves source bytes from the original dirty tree; `snapshots/lifecycle-accepted.tar.gz` records the first accepted batch. These are local rollback aids, not committed dependencies. The [repair manifest](REPAIR_MANIFEST.json) and [baseline-relative patch](repair.patch) identify only changes made after capture, including new tests. Recreate them with `python3 docs/research/workspace-stabilization/capture_patch.py` after a final edit. Restore only repair-owned files after inspecting that diff; do not reset the whole working tree or overwrite unrelated concurrent work.
