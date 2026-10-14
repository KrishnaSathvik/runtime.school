# SQL navigation audit and Python alignment

Audited the current SQL implementation in `features/rt/pages/LearnEntry.tsx`, `Practice.tsx`, `Project.tsx`, `rt/entry.ts`, `discovery/selectors.ts`, and `practice/browser.ts`.

| Area | SQL behavior | Python alignment |
| --- | --- | --- |
| Main navigation | Learn, Practice, Projects inside the workspace shell | Same shell and three labels; destinations stay within Python |
| Learn entry | First unfinished lesson, after saved progress loads | First lesson not independently mastered; opens saved lesson step |
| Lesson browsing | All lessons drawer and previous/next | Searchable All lessons drawer, mastery markers, previous/next; course overview available inside drawer |
| Practice entry | Resume current unfinished question, then next unfinished question; assisted passes count as finished | Most recently visited question, then next unfinished question, wrapping at the end; independent and assisted results remain distinct |
| Question browsing | All questions drawer and previous/next | Searchable All questions drawer, result markers, previous/next; tracks, cases, module filters available inside drawer |
| Projects entry | First project brief, or most recent project at next unfinished milestone | First project brief, or most recently worked project at next unpassed milestone |
| Project browsing | All projects drawer; brief and milestone work | Searchable All projects drawer; brief, milestone selection, program workspace; filters/preparation available inside drawer |
| Work layout | Brief on left, editable solution and checks on right | Existing Python lesson/exercise split retained; project brief collapses when a milestone opens |
| Persistence | SQL progress store | Existing `runtime-python-v1` schema and stable content refs retained |

The subject content remains different: Python includes output prediction, program files, packages, and downloadable source/results/checked summaries. SQL retains its query-specific result evidence and report export. Python uses an explicit Next question link after a pass; SQL currently advances automatically after 900 ms. Python projects retain cumulative milestone gating. These assessment behaviors were not changed by navigation alignment.

## Routes

- `/python`, `/python/practice`, `/python/projects`: open work after progress hydration.
- Add `?browse=1` to view the retained course, practice, or project catalog.
- Existing module-filter practice links still open the filtered question browser.
- Project resume links include `?stage=<stage-id>`; inaccessible stages cannot execute.
- Direct lesson, question, track, case, and project URLs remain available.

## Validation

- Five focused entry-selector tests: fresh progress, mastery vs help, recent practice, project continuation, completed-content fallback.
- Scoped application TypeScript and changed-file ESLint.
- Desktop/mobile browser checks: entries, drawer inventory, selection, question/project resume, course overview, project brief, Escape, overflow, and accessibility.
- Retained discovery checks cover difficulty/skill/search filters, preparation links, saved mastery, and module practice.

SQL source, grading, persistence and routes were not modified. The Python production runtime gate remains unchanged. Local work only; no push or deployment.
