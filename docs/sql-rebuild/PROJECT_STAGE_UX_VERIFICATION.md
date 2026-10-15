# Project stage contract verification

The user-provided `PROJECT_STAGE_UX_CONTRACT.md` is the accepted specification. It supersedes older guidance that made findings optional and used a single report box. Existing canonical dataset identities and the ten-project catalog remain intact.

## Implemented

- Shared compact header and temporary, keyboard-dismissable stage/table dialogs.
- Full-width orientation, synthesis, and report; 35/65 SQL workspace split above 1024px of available width; stacked mobile layout.
- Canonical table grain, keys, types, relationships, expandable columns, and live previews of up to 20 rows.
- Required checkpoint finding after semantic validation; independent exploration snapshots and minimum saved findings.
- Warehouse state validation, source preservation, replay of earlier validated scripts in an isolated database, and repeated execution checks for incremental loads.
- Draft persistence with retry and navigation-away warning on storage failure; previous saved findings survive SQL edits.
- Level-specific review/report fields, selectable findings with separate report wording, preview, Markdown export, and explicit project completion.

## Verification

`npm run typecheck:sql` and targeted ESLint passed. Six Vitest suites passed (75 tests), including existing reference SQL execution, routes, legacy findings, new completion rules, export selection, warehouse object validation, and idempotency.

`BASE_URL=http://127.0.0.1:3055 node tests/e2e/projects-contract.mjs` exercises the complete beginner journey, refresh persistence, stage locks, a mobile table sheet, real previews, report export/completion, library state, exploration, build validation/replay, and simulated storage failure followed by successful retry.

Browser runtime discovery returned no available browsers, so verification used local Playwright Chromium. Rendered screenshots were inspected at desktop 1440×1000 and mobile 390×844. The supplied reference is a textual specification, not a concept image; no alternative visual redesign was generated.

## Visual review

| Contract point | Rendered result / correction |
| --- | --- |
| Header/navigation | Restrained project title, stage position, All stages; fixed overlap with the existing 48px site header. |
| Stage layout | Two columns only for SQL work; brief/review/report use centered full-width content. |
| Typography/palette | Existing Runtime white/graphite/amber styling retained; technical type confined to SQL and schema. |
| Learner terminology | View tables, Saved findings, Check, Save & continue, Export Markdown; removed the Answer action. |
| Form placement | Finding below successful SQL output; saved findings reused immediately after report summary. |
| Mobile/results | Context stacks above SQL; results scroll internally; table dialog fills the viewport. |
| Data presentation | Replaced bundled five-row samples with live previews up to 20 rows and explicit total-row context. |

Optional scratch notes, PDF export, and solution reveal are deferred as permitted by the contract. Browser tests cover representative beginner and warehouse flows, not every possible learner solution across all ten projects. Drafts remain browser-local using the application's existing persistence mechanism.
