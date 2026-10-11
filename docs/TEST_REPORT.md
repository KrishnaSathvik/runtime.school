# Learn-first refinement — 2026-10-10

996 unit tests, 54 acceptance checks, 34 learner checks, 12 V5 checks, four navigation/theme journeys and three keyboard-platform checks passed. Build, lint and TypeScript passed. [Current report and screenshots](v5/LEARN_MAIN_REFINEMENT.md). The earlier full V5 verification below is historical.

---

# V5 product redesign verification — 2026-10-09

All existing and new full browser suites ran against `.next-v5-reviewed` on port 3232. No deployment or push occurred. **264 exercises, 249 practice-eligible, 88 lessons, 11 datasets, six tracks, five projects and two cases** remain intact.

| Check | Actual final result | Evidence |
| --- | --- | --- |
| Unit tests | 990 tests / 21 files passed | [Result](v5/evidence/unit.log) |
| Inventory generation | 1 test passed; inventory unchanged | [Result](v5/evidence/inventory.log) |
| ESLint | Passed; zero errors/warnings | [Result](v5/evidence/lint.log) |
| TypeScript | Passed; no diagnostics | [Result](v5/evidence/tsc.log) |
| Production build | Passed; isolated .next-v5-reviewed build | [Result](v5/evidence/build.log) |
| Acceptance | 54/54 passed | [Result](v5/evidence/acceptance-results.json) |
| Learner quality | 34/34 passed, including exports from all five projects | [Result](v5/evidence/learner-quality-results.json) |
| Learning experience | 5/5 passed | [Result](v5/evidence/learning-experience-results.json) |
| Keyboard shortcuts | 3/3 emulated platforms passed | [Result](v5/evidence/shortcuts.log) |
| V4 exercise flows | 23/23 passed; 70 populated-state axe scans | [Result](v5/evidence/v4-results.json) |
| V5 journeys and visual checks | 12/12 passed; 20 axe scans | [Result](v5/evidence/v5-results.json) |
| Language regression | 10/10 passed; 112 rendered states; 20 axe scans | [Result](v5/evidence/content-language-results.json) |
| Layout, zoom and themes | 792 measurements; 0 failures; interaction checks passed | [Result](v5/evidence/layout-results.json) |
| Responsive screen sweep | 384 screens; zero issues | [Result](v5/evidence/sweep-results.json) |
| Full accessibility suite | 136 axe scans; 0 violations of any severity | [Result](v5/evidence/axe-results.json) |

[Route changes, preserved contracts and limitations](v5/V5_IMPLEMENTATION_REPORT.md) · [Before/after screenshots](v5/SCREENSHOTS.md).

The original project grading also credits the corresponding course lesson; V5 retains this behavior, correcting a baseline assumption in the specification. Browser verification uses isolated Chromium contexts, not physical devices or manual screen-reader testing.

Previous reports below are historical.

---

# UX language verification — 2026-10-09

The completed language pass reviewed **622 learner-facing text locations** and identified/corrected **205 documented wording issues**. Final local build: `.next-language-final`, served on port 3232. The inventory remains **264 exercises, 249 practice-eligible, 88 lessons, 11 datasets, six tracks and five projects**.

| Check | Final actual result | Evidence |
| --- | --- | --- |
| `npm test` | 981 tests / 19 files passed | [Result](ux/evidence/tests.log) |
| `npm run qb:report` | 1 generation test passed; artifacts synchronized | [Result](ux/evidence/inventory-generation.log) |
| `npm run lint` | Passed; zero errors/warnings | [Result](ux/evidence/lint.log) |
| `npx tsc --noEmit` | Passed; no diagnostics | [Result](ux/evidence/tsc.log) |
| `NEXT_DIST_DIR=.next-language-final npm run build` | Production build passed | [Result](ux/evidence/build.log) |
| Acceptance | 54/54 passed | [Result](ux/evidence/acceptance-results.json) |
| Learner journeys | 34/34 passed | [Result](ux/evidence/learner-quality-results.json) |
| Learning experience | 5/5 passed | [Result](ux/evidence/learning-experience-results.json) |
| Keyboard shortcuts | 3/3 emulated platforms passed | [Result](ux/evidence/shortcuts.log) |
| V4 exercise flows | 23/23 passed; 70 populated-state axe scans without violations | [Result](ux/evidence/v4-results.json) |
| New content-language suite | 10/10 passed; 100 rendered states; 20 axe scans without violations | [Result](ux/evidence/language-results.json) |
| Layout / zoom / themes | 494 measurements; zero failures; interaction checks passed | [Result](ux/evidence/layout-results.json) |
| Responsive sweep | 336 screens; zero issues | [Result](ux/evidence/sweep-results.json) |
| Full accessibility suite | 124 axe scans; zero violations of any severity | [Result](ux/evidence/axe-results.json) |

[Full audit, before/after ledger and screenshots](ux/CONTENT_LANGUAGE_AUDIT.md) · [Writing guidelines](ux/UX_WRITING_GUIDELINES.md).

The final checks preserve SQL/grading, hints and earned credit, project work, backup recovery, keyboard actions, themes and responsive layouts. Existing copy assertions were updated to the new language while retaining their behavior assertions. Only final successful runs appear in the table.

Limits: isolated Chromium contexts and device emulation, not physical mobile keyboards or manual VoiceOver/NVDA, Safari or Firefox. Predict still uses explained JSON row entry. No real learner comprehension study was performed. Everything remains local.

The prior V4 and learner-experience reports below are historical evidence.

---

# V4 verification — 2026-10-09

Final local production build: `.next-v4-complete`, served on port 3232. **972 unit tests passed; every browser suite passed.** All 247 original questions remain, with 17 additions: six Predict Output, six Debug Query and five capacity Write SQL exercises. Generated totals: **264 unique, 249 practice-eligible, 88 lessons, 11 datasets, six tracks, five projects**.

| Command / scope | Final actual result | Evidence |
| --- | --- | --- |
| `npm test` | 972 tests / 18 files passed | [Unit log](v4/evidence/tests.log) |
| `npm run qb:report` | 1 generation test passed; current artifacts synchronized | [Generator log](v4/evidence/inventory-generation.log) |
| `npm run lint` | Passed, zero errors/warnings | [Lint log](v4/evidence/lint.log) |
| `npx tsc --noEmit` | Passed, no diagnostics | [TypeScript log](v4/evidence/tsc.log) |
| `NEXT_DIST_DIR=.next-v4-complete npm run build` | Production build passed | [Build log](v4/evidence/build.log) |
| `BASE=… npm run test:e2e` | 54/54 acceptance checks passed | [Results](v4/evidence/acceptance-acceptance-results.json) |
| `BASE=… npm run test:learner` | 34/34 learner checks passed | [Results](v4/evidence/learner-quality-results.json) |
| `BASE=… npm run test:learning` | 5/5 learning journeys passed | [Results](v4/evidence/learning-experience-results.json) |
| `BASE=… npm run test:shortcuts` | 3/3 emulated platform checks passed | [Log](v4/evidence/shortcuts.log) |
| `BASE=… npm run test:v4` | 23/23 checks passed, including 70 populated-state axe scans without violations | [Results](v4/evidence/v4-results.json) |
| `BASE=… npm run test:layout` | 494 measurements; zero failures; interactive checks passed | [Report](v4/evidence/layout-report.json) |
| `BASE=… npm run test:sweep` | 336 screens; zero issues, corrected theme/exit checks | [Report](v4/evidence/sweep-report.json) |
| `BASE=… npm run test:a11y` | 124 scans; zero violations of any severity | [Report](v4/evidence/axe-results.json) |

The final V4 suite includes 70 populated-state axe scans across seven widths and both themes. The full layout suite covers 494 route/viewport/theme/zoom measurements. Baseline acceptance was 52/54 and baseline axe found 14 serious toolbar-target violations; the final suites resolve these. The older sweep's self-comparing theme check and missing failure exit were corrected, and the complete corrected sweep was rerun successfully against the same build. Unit/grading coverage includes all new references, alternative SQL, deliberately wrong starters and changed fixtures.

[Full implementation report](v4/V4_IMPLEMENTATION_REPORT.md) · [Source register](v4/SOURCE_REGISTER.md) · [Screenshots](v4/V4_IMPLEMENTATION_REPORT.md#screenshots-and-accessibility).

Limits: Chromium automation and device emulation do not certify physical mobile keyboards, VoiceOver/NVDA or Safari/Firefox. JSON prediction input and browser-local concurrent writes retain the limitations documented in the report. No original-site edits, real user progress changes, cloud service, deployment or push occurred.

The report below is retained as historical evidence for the previous learner-experience phase; its inventory and test counts are not the current V4 totals.

---

# Test report — learner experience pass, 2026-10-09

Fresh baseline: **745 tests / 15 files**, **54 acceptance checks + 5 learning journeys**, TypeScript and production build passed. Initial whole-tree lint scanned generated builds and preserved reference/vendor assets and failed; exclusions now keep those immutable assets out of application lint. See [baseline](audit/LEARNER_EXPERIENCE_BASELINE.md).

## Final verification

| Command / scope | Actual result | Evidence |
| --- | --- | --- |
| `npm test` | 794 passed, 17 files | Includes all original 745 plus 5 review-session, 43 quiz proof/content, 1 track-resume regression |
| `npm run test:e2e` | 54/54 passed | [Acceptance JSON](audit/learner-evidence/acceptance/acceptance-results.json) |
| `npm run test:learning` | 5/5 passed | [Learning JSON](audit/learner-evidence/learning/results.json) |
| `npm run test:learner` | 34/34 passed | [Expanded persona JSON](audit/learner-evidence/final/results.json) |
| `npm run test:a11y` | 124 scans, zero violations | [Axe JSON](audit/learner-evidence/accessibility/axe-results.json) |
| `npm run test:sweep` | 336 screens, zero layout issues | [Responsive JSON](audit/learner-evidence/responsive/report.json) |
| `npx tsc --noEmit` | Passed | No reported diagnostics |
| `npm run lint` | Passed: zero errors, one existing unused-catch-variable warning in `public/theme-boot.js` | Original Site, bundled vendor and generated build output excluded; no source rules weakened |
| `NEXT_DIST_DIR=.next-quality-final npm run build` | Passed | Next.js 15.5.9 local production build |

Final browser total: 93 scenario checks. See [final assessment](audit/LEARNER_EXPERIENCE_FINAL.md). The first expanded run was 31/32 and exposed the mobile first-tap bug; the rerun adds six-width single-tap and activity-recency checks. Earlier harness failures were corrected without changing SQL grading.

Preserved inventory: **10 modules · 88 lessons · 176 original challenges · 71 independent questions · 247 unique questions · 232 practice-ready · 9 datasets · 6 tracks · 5 projects**. Original question-manifest synchronization and all reference/changed-data checks pass. 204 walkthrough stages remain.

## Coverage and limits

All lesson examples/walkthroughs execute; all 176 lesson answers and 71 bank answers grade on original/changed fixtures. Existing tests retain mastery/guidance, import/migration, tracks, plan-aware grading, state validation/replay, formatter, SQL-worker timeout/crash/recovery and project exports. New browser coverage completes 18 representative lessons across all ten modules, resumes each of six tracks, completes two milestones in every project and downloads their Markdown, verifies two tabs, unknown routes, blocked-worker recovery and actual timeout, and scans changed states in both themes.

Responsive widths: **320, 375, 390, 430, 768, 820, 1280, 1440**, Light/Dark, 21 routes. System preference/explicit appearance persistence is exercised in existing browser journeys. Changed-state axe and teaching-demo scans supplement the dedicated 124 scans; they are listed separately to avoid implying every screenshot was an axe scan.

No physical phone keyboard or manual VoiceOver/NVDA test was performed. [Manual checklist](audit/MANUAL_DEVICE_CHECKLIST.md). No human usability study was performed.

## Run locally

```bash
NEXT_DIST_DIR=.next-quality-final npm run build
NEXT_DIST_DIR=.next-quality-final npm start -- --port 3219
# In a second terminal:
BASE=http://localhost:3219 npm run test:e2e
BASE=http://localhost:3219 npm run test:learning
BASE=http://localhost:3219 npm run test:learner
BASE=http://localhost:3219 npm run test:a11y
BASE=http://localhost:3219 npm run test:sweep
```

The review browser assertion now requires exact Write-stage restoration after reload. It no longer re-answers Recall to accommodate the old limitation. The 42 documented quiz parity exceptions correct educational mismatches; SQL challenge answers, grading contracts, original reference and mastery requirements remain preserved.
