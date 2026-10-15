# Runtime dataset standard

Identity is `(datasetId, datasetVersion, edition)`. Versions are exact semantic versions; editions are `learn`, `practice`, `project`. Resolution never silently upgrades. Lesson, question, project and progress IDs remain independent. Changing row semantics requires a version change after publication.

`src/data/datasets/types.ts` defines metadata and validation; `registry.ts` resolves contracts. Every table declares grain, columns and meanings, nullability, primary key and foreign keys. Every edition declares actual counts. Sources record publisher, original URL/release, license and license URL, commercial-use status, attribution, transformations and reproduction. Unverified commercial reuse prevents registration. Automated validation supplements, rather than replaces, authoritative license review.

Generators use versioned deterministic integer schedules or a fixed seeded PRNG. No ambient randomness or current clock is allowed. `saas.ts` uses seed 42; other synthetic schedules have no random seed because they contain no random-number calls. Tests assert relationships, counts, reproducibility and actual edge-case presence. Synthetic distributions describe authored scenarios, not industry benchmarks. Healthcare contains fictional operational metrics, not real patients or diagnostic advice.

## Build and reproduce

`npm run datasets:build` creates 33 JSON assets in `public/datasets/<id>/<version>/<edition>.json`. Generated large assets are ignored by Git and rebuilt by predev/prebuild. Catalog, counts, SHA-256 manifest, learner previews and compact teaching fixtures in `src/data/datasets/generated/` are checked in. Never edit them manually. `npm run qb:report` regenerates content examples, schema context, inventory, migration decisions and usage links.

Default builds are offline: three compressed, selected source snapshots are checked in, not enormous upstream archives. Reacquisition is optional:

```sh
node scripts/datasets/download-sources.mjs /tmp/runtime-sources
node scripts/datasets/import-retail.mjs /tmp/runtime-sources/runtime-online-retail-ii.zip
node scripts/datasets/import-weather.mjs /tmp/runtime-sources
node scripts/datasets/import-iot.mjs /tmp/runtime-sources/runtime-appliances.zip
npm run datasets:build
npm run qb:report
```

Importers read data only; they never execute workbook formulas or upstream code. UCI archive hashes and NOAA station-file hashes are pinned. Live NOAA files change; a hash mismatch requires reviewing and versioning the new snapshot. Exact offline reproduction uses the committed compressed records and station metadata. Source details and hashes are in each real dataset's `source.json` and metadata.

## Runtime adapter

The SQLite asset holds schema/inserts, changed-data statements and scoped previews. Every execution starts a disposable database. Writes cannot modify assets or another workspace. Read-only worker enforcement remains enabled outside labs. Table names may overlap between datasets; execution and previews must resolve the same identity. Loading failures show retry controls and never substitute another database. Abort/stale-response handling protects dataset switching.

Learn and graded Practice use the inspectable learn edition through `teaching.ts`, preserving the synchronous existing content contract. Its entire generated JSON is approximately 584 KiB before compression. Practice/project exploration assets load on demand through `client.ts`; generator code and source archives never enter the client bundle. Project and Lab drafts include dataset/project version and edition in their keys. Existing learner keys are retained.

## Portfolio and provenance

| ID | Kind | Source and transformation |
|---|---|---|
| retail | Real | UCI Online Retail II, CC BY 4.0; observed header keys preserve conflicting invoice headers, signed lines and anonymous customers |
| weather | Real | NOAA/NCEI GHCN-Daily, U.S. public domain; three stations, 2000–2024, original units/flags, complete calendar |
| iot | Real | UCI Appliances Energy Prediction, CC BY 4.0; room sensor and energy fields only, excluding third-party airport weather and irrelevant random columns |
| saas | Synthetic | Runtime lifecycle model, correlated plans/activity, retries, late ingestion, churn/reactivation |
| payments | Synthetic | Authorization attempts distinct from settlements and refunds; integer cents |
| logistics | Synthetic | Packages within shipments; duplicate, missing, delayed and out-of-order scans |
| developer | Synthetic | Manager hierarchy, reviews, deployments and incidents at distinct grains |
| healthcare | Synthetic | Fictional encounters and operational observations; cancellations and repeat visits; not Synthea |
| energy | Synthetic | Hourly regional balance, fuel mix, directional transfers, forecast errors; not EIA |
| flights | Synthetic | Fictional UTC schedules, cancellations, early departures and regional disruptions; not BTS |
| mobility | Synthetic | Fictional zones, rush-hour demand/congestion, unknown cash tips and overnight trips; not NYC TLC |

No unsupported license is inferred for an external dataset. The preferred BTS archive was investigated but not bundled without verified exact reuse terms. Self-contained synthetic flights, mobility and energy model the required SQL shapes without implying real-world representativeness. Eleven domains are intentional: sports would repeat existing ranking/streak/time-series shapes, so no additional dataset was manufactured to meet a quota.

## Evidence and limits

`edition-benchmarks.json` records all 33 editions: fetch/parse time, bytes, select, aggregation, window and relationship-join timings using the shipped browser worker. All measured queries were below the three-second budget. These are desktop Chromium measurements at a mobile viewport, not a physical-phone guarantee. `performance.memory` reports page heap only; worker WASM memory is not exposed, and the report states that limitation. Project reference queries separately enforce a three-second test budget; the retention query was rewritten after an initial 16-second failure.

The eleven original course fixtures remain for inspectable foundations and specialized engineering/project contracts. They are explicitly separate from the flagship library; no legacy dataset or learner route was retired. Review `MIGRATION_AUDIT.md` for each decision.
