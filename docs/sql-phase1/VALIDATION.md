# Phase 1 validation

Validated locally on the final Learn/Practice implementation. No deployment or commit was performed. Python work remains paused.

| Check | Result |
| --- | --- |
| `npm run test:sql` | 53 files, 1,351 tests passed. |
| Canonical learning tests | 29 passed, included in the SQL suite. |
| `npm run typecheck:sql` | Passed. |
| `npm run lint` | Zero errors; eight existing warnings in paused Python files. |
| `NEXT_DIST_DIR=.next-phase1-tables npm run build` | Passed, including the final table rendering correction. |
| `git diff --check` | Passed. |
| `BASE=http://127.0.0.1:3104 node tests/e2e/learning-canonical.mjs` | All four desktop/mobile and light/dark combinations passed against the final production build. |
| `BASE=http://127.0.0.1:3104 node tests/e2e/learning-domain-smoke.mjs` | All twelve dataset domains, review and placement passed against the final production build. |

The SQL suite covers reference solutions on base and changed data, authored equivalent solutions, documented wrong approaches, hard-coded answers, and state/constraint/replay behavior for applicable tasks. It also verifies generated artifacts, canonical schema closure, foreign-key integrity, Sports score reconciliation, preserved draft/progress migration and frozen-surface compatibility.

Browser checks cover 1440px desktop and 390px mobile in both themes: twelve dataset filters, lesson challenges and quiz, Practice Write/Debug/Predict grading, prerequisites, retained older drafts, new draft persistence and layout overflow. The `store_orders` preview displays six column headers and real data rows, with horizontal scrolling on narrow screens and no extra grain-description paragraph. Axe WCAG 2 A/AA checks reported zero violations; browser checks reported no page errors.

Evidence:

- [Four-mode browser results](browser-results.json)
- [Twelve-domain, review and placement results](domain-browser-results.json)
- [Mobile table screenshot](screens/orders-light-390.png)
- [Desktop table screenshot](screens/orders-light-1440.png)
- [Dark mobile table screenshot](screens/orders-dark-390.png)
- [Dark desktop table screenshot](screens/orders-dark-1440.png)

Full-repository `npx tsc --noEmit` still reports the pre-existing incomplete `ProjectV2` fixture cast at `tests/python-projects-v2-state.test.ts:5`. The SQL check excludes Python test files and passes. No Python source or Python tests were changed for this phase.
