# Structural UX audit — 12 October 2026

Preview: http://localhost:3040

[Before/after screenshot gallery](index.html)

## Changes

- Shared hub and activity headers; lesson/module breadcrumbs and previous/next navigation; compact milestone navigation. Learn, Practice and Projects remain primary.
- One Learn continuation block, small mastery/review counts, and the current module’s lessons expanded beneath its row. Practice paths precede progress explanations. Planned subjects are secondary.
- Lesson reading uses a prose column and desktop reference rail. Removed repeated lesson titles, exposed the walkthrough, and automatically ran the real teaching example without grading. Teaching demonstrations wait for the example execution so they do not interrupt it.
- Shared keyboard- and pointer-adjustable task/editor split for lessons, questions, milestones, placement, Playground and Lab. Preserved the editor/results divider, drafts, Run, Check and feedback. Tables scroll within their pane; simple-question rules sit with the task. Help is beside Run/Check, with deliberate hint/answer actions and existing mastery effects.
- Project overview shows Start/Continue, prerequisite skills, dataset names and milestones before detailed business/data exploration. Milestones open in SQL work; the optional teaching view remains accessible. The finish flow holds the sole findings editor, connected to saved checks. Two independent SQL solves and the concept check still determine mastery; findings determine report readiness separately.
- Placement Skip/Next is in the header. Lab experiment choices use a compact grid. Syntax/plan code scrolls without wrapping; SQLite comparison output spans the comparison width. Settings use an aligned two-column desktop grid. Sidebar background continues down long pages. Removed remaining blue course accents while preserving meaningful editor syntax colors and feedback.

## Verification

- 42 targeted tests across continuation, learning sequence, project findings, project grading, workspace context and trust labels passed. Updated two stale URL expectations to the existing canonical lesson routes and corrected an empty-state test type annotation.
- Browser journey: beginner lesson → two independent SQL checks → concept check → completion; Practice SQL survives reload; hints retain assisted status; answer reveal requires confirmation; sample-table columns scroll horizontally.
- Browser journey: project Start → SQL workspace → two checked challenges → one finding → concept check → completion; checked work and finding survive reload. Placement Skip advances without granting mastery.
- Real outputs checked in Playground, Database Lab (including explained constraint failure), Query Performance and SQL Syntax. An advanced JOIN lesson displays both its actual example output and interactive teaching output.
- 1440 × 900 desktop, 1440 × 560 short desktop, and 390 × 844 mobile in light and dark themes. Checked document overflow, visible desktop execution controls/results, resizing, and help-panel visibility.
- Targeted Axe checks on lesson reading, Practice with help open, a milestone, Settings and SQL Syntax: no violations after fixing a help-link contrast issue.
- ESLint, TypeScript and local production build passed. No deployment.

## Evidence and limits

Before screenshots were captured from the already running local build on port 3232; after screenshots use port 3040. The checkout already contained extensive changes at the start of this audit; those were preserved. The engine, curriculum content, persisted progress model, grading rules and legacy/SEO routes were not modified by this pass.

The referenced three-page PDF was not attached, so the implementation follows the supplied written feedback and existing visual system. The managed Browser connection was unavailable; local isolated Playwright browser contexts supplied the screenshots and interaction verification. Testing was targeted, not the full regression suite or a visual inspection of all 88 lessons and 249 questions. Advanced tasks still need scrolling for their complete requirements and tables. Task-pane width lasts for the mounted workspace; the existing editor/results preference remains persisted.

Reproduce with the app running on port 3040:

```sh
node scripts/structural-verify.mjs
node scripts/structural-accessibility.mjs
node scripts/structural-final-screens.mjs
npx vitest run tests/course-continuation.test.ts tests/learning-sequence.test.ts tests/project-findings.test.ts tests/projects.test.ts tests/workspace-context.test.ts tests/trust-labels.test.ts
```
