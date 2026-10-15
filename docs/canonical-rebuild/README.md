# Canonical dataset rebuild: Learn and Practice

Learn and Practice now run on twelve realistic, full-scale datasets instead of small fixtures. This folder is the report for that rebuild.

| Report | Contents |
| --- | --- |
| [DATASETS.md](DATASETS.md) | Every dataset: kind, source, licence, attribution, coverage, tables with rows and grain, sizes, transformations, edge cases |
| [CONTRACTS.md](CONTRACTS.md) | The contract each dataset passes (schema, relationships, minimum rows, coverage, diversity, edge cases) |
| [LEARN_AUDIT.md](LEARN_AUDIT.md) | All 88 lessons: decision, dataset and reason |
| [PRACTICE_AUDIT.md](PRACTICE_AUDIT.md) | All 139 questions: decision, format, difficulty, topic, dataset, slug status |
| [COVERAGE.md](COVERAGE.md) | Topic × difficulty, the previously thin patterns, dataset × format |
| [DISTRIBUTION.md](DISTRIBUTION.md) | Lessons and questions per dataset, and how often Practice transfers to a new domain |
| [PERFORMANCE.md](PERFORMANCE.md) | Browser measurements on the full data, including throttled first loads |

The data reports are generated from the sources by `npm run qb:report`; browser measurements come from `npm run test:canonical:e2e` against a running build.

## What changed

- **Datasets.** Twelve canonical datasets, one identity each (`datasetId` + `datasetVersion` 3.0.0), no editions or size selectors: 1,657,754 rows in total (89K–238K per dataset), 5–10 tables and 40–76 columns each. Five are real public data (BTS flights, NYC taxi trips, NOAA weather, EIA-930 grid data, Retrosheet baseball), Retail is real UCI Online Retail II invoices with modelled payments and history, and six are deterministic synthetic generators (SaaS, Payments, Healthcare, IoT, Logistics, Developer Platform). Healthcare contains no real patient data. Sources, licences, versions and transformations are recorded per dataset, and every dataset rebuilds reproducibly (`npm run datasets:canonical`).
- **Delivery.** Each dataset ships as one content-hashed, gzip-compressed SQLite file (55 MB in total; 2.6–8.1 MB each), verified by SHA-256 in the browser worker and cached immutably. Lesson and question pages start the download while the learner reads. Previews of 12 rows ship with the page; every query runs on the full data.
- **Learn.** All 88 lessons were re-authored on the dataset locked by the specification (Retail carries the foundations and the warehouse sequence). 83 MIGRATE, 5 REWRITE, none retired. Ids, titles, modules and challenge ids are unchanged.
- **Practice.** All 114 earlier questions keep their ids and formats; 62 were rewritten because their tasks depended on retired fixture data, 52 migrated. 25 new questions cover fill-forward, interval merging, streaks and gaps, correlated subqueries, relational division, hierarchies, histograms and percentiles, graph walks, symmetric pairs, overlap detection and more Predict/Debug cases. Renamed slugs keep working as aliases. Both case studies were rebuilt on the SaaS and Energy datasets.

## Progress compatibility

- Lesson and question ids are unchanged, so solved state, attempts, hints and review schedules carry over.
- Every earlier practice slug still opens the same question (18 are now aliases; the page’s canonical link points at the new slug). This is enforced against a fixture of all earlier ids and slugs.
- Drafts are stored per dataset version. A draft written against the old data is not run against the new schema; it is kept and shown under “Previous drafts preserved” on the same exercise.
- Verified in the browser: a pre-rebuild saved state (solved question, lesson progress, draft) survives, an old slug opens the right question, and the old draft is offered.

## Verification

| Check | Result |
| --- | --- |
| Dataset contracts (`tests/canonical/datasets.test.ts`) | 27/27 pass: all 12 shipped files match their SHA-256, pass their contracts and scale targets |
| Learn correctness (`tests/canonical/learn.test.ts`) | 263 pass, 2 skipped by design (DDL lessons 58 and 60 have constant output) |
| Practice correctness (`tests/canonical/practice.test.ts`) | 256 pass; Predict and lab items skip the changed-data comparison by design |
| Engine features and wrong answers (`tests/canonical/engine-features.test.ts`) | 138 pass: plan checks, write probes, replay safety, fixture isolation, every wrong answer is valid SQL that fails |
| Independent anchors (`tests/canonical/anchors.test.ts`) | 10/10 reference answers match a TypeScript recomputation from raw rows |
| Schema and previews (`tests/canonical/schema.test.ts`) | Every overlay table and view is parsed exactly as SQLite creates it; every table shown has a small preview |
| Full test suite (`vitest`) | SQL: 58 files, 1,893 passed, 41 skipped by design. Python: 28 files, 753 passed |
| Typecheck | `npm run typecheck:sql` clean; full-project `tsc` clean except one existing Python projects test outside this work |
| Lint | 0 errors; the 8 remaining warnings are in Python course files outside this work |
| Production build | Passes; 157 practice routes prerender (139 questions + 18 earlier slugs) |
| Browser (`tests/e2e/canonical.mjs`) | All 176 Learn checks and 139 Practice checks pass on the full data in Chromium; 58 Learn/Practice UI flows pass at 1440 px and 390 px with no page errors |

## Known limitations

- Retail’s invoice-line table has 7 columns: the UCI source has only 8 fields in total, and adding columns would mean inventing data. Every other dataset’s main fact table has at least 8.
- First load is download-bound: 0.5–1.5 s on a 50 Mbps connection and 2.3–6.8 s on 10 Mbps mobile, depending on the dataset. After that the file is cached permanently and queries take milliseconds.
- Measurements are from headless Chromium on a desktop CPU, not physical mobile hardware. The worker’s WebAssembly memory is not exposed to `performance.memory`.
- Projects, Playground, Database Lab, Query Plans and Compare still use the earlier dataset library; they were out of scope and only received compatibility fixes.
