# SQL rebuild handoff

Implemented in the working tree. Nothing was committed, deployed or published. Existing Python edits are preserved.

## Review the product

- `/sql/playground`: eleven flagship datasets, three editions each, scoped schemas, source/license/grain cards and usage links.
- `/sql/lesson/13`, `/sql/lesson/24`, `/sql/lesson/27`: weather conditional aggregation, flight LAG transfer, developer hierarchy recursion.
- `/sql/practice`: open **All questions** and filter by skill or dataset. New IDs qb-0089–0112. Prediction tasks conceal expected output until explicit reveal.
- `/sql/projects`: 10-project catalog (library + single-column workspaces). Old guided project and `/sql/projects/library/*` URLs redirect here.
- `/sql/lab/datasets`: disposable writable datasets, staging/constraint/rollback presets, independent drafts.
- `/sql/query-plans`: choose the Retail or Product events comparison; plans execute against project-sized editions.

Primary navigation remains Learn / Practice / Projects. No additional global progress dashboard was added. Six Learn tracks and lesson progress IDs remain; the old guided Projects surface is retired in favor of the catalog. Changed lesson schemas keep earlier drafts readable while starting an independent versioned draft.

## Verify and reproduce

```sh
npm run qb:report
npm run typecheck:sql
npm run test:sql
npm run lint
NEXT_DIST_DIR=.next-sql-rebuild npm run build
```

Start a local server on port 3100 for the browser scripts, then run `npm run test:datasets:e2e`. Each run uses only local browser SQLite and public static assets. Build requires no external acquisition because selected compressed real-data snapshots are committed; optional source download/import commands are in DATASET_STANDARD.md.

## Results

- 1,310 SQL/shared tests across 52 files passed.
- Production build and SQL-scoped type checking passed.
- Full lint: zero errors, eight existing Python warnings.
- All 33 editions met the three-second query budget in the recorded browser run; maximum measured query approximately 332 ms. Project reference queries also enforce the budget.
- Browser flows passed: migrated lessons, prediction submission without pre-revealed output, dataset loading/retry, isolated Lab runs, persisted project SQL/findings, stale evidence, export and real query plans.
- Desktop/mobile screenshots reviewed; project checks found no horizontal page overflow. Light/dark project WCAG A/AA scans reported no violations in the tested states.

Repository-wide `npx tsc --noEmit` remains blocked by an existing incomplete Python project test fixture at `tests/python-projects-v2-state.test.ts:5`. The SQL check excludes Python test files explicitly; it does not suppress application type errors. That fixture was left untouched because Python work is paused. Resolve it before claiming that every repository-wide check is green.

## Deliberate scope decisions

Eleven flagship domains, rather than twelve near-duplicates; 24 new exercises, rather than a numeric quota. Retail, weather and IoT are real licensed subsets. Flights, mobility, energy and healthcare are documented synthetic models, with no claim to be the preferred upstream sources. Practice uses inspectable editions; larger editions support exploration, Lab, projects and plans. Foundation and specialized legacy fixtures remain where migration would weaken instruction. Projects are the 10-catalog surface only; old guided and library investigation URLs redirect.

See MIGRATION_AUDIT.md and migration-audit.json for every lesson/exercise decision; PATTERN_COVERAGE.md for requested reasoning families; DATASET_STANDARD.md for metadata, source/license and reproduction rules. Machine-readable performance evidence is in edition-benchmarks.json and browser-performance.json. Screenshots are in screens/.

No production infrastructure, paid services, external accounts or deployment configuration changed. Physical mobile hardware, other browser engines and worker-level memory profiling remain outside the recorded validation; viewport emulation and page heap are labeled accordingly.
