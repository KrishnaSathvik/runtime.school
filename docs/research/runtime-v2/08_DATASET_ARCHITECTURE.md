# Dataset architecture

Investigation: 2026-10-20. Findings below are verified from local source, not executed build output or production downloads. This document proposes a unifying metadata view over existing infrastructure; it does not propose rebuilding the datasets.

## Verified foundations

SQL has twelve canonical domain identities in `src/data/datasets/learning-map.ts`: retail, flights, saas, mobility, weather, energy, payments, healthcare, iot, logistics, developer, sports. `LearningDatasetRef` contains dataset ID and version. `src/data/datasets/learning.ts` exposes `LearningMetadata`, `LearningAsset`, `learningDataset` and `datasetForUrl` over generated manifests.

The metadata already includes table grain, primary and foreign keys, nullable columns, indexes, row counts, provenance, release and license, attribution, transformation history, coverage, synthetic/real/hybrid classification, reproduction details, edge cases and quality notes. Assets include compressed and uncompressed sizes, SHA-256, previews, immutable-looking hash filenames and changed-data mutations. `learningDataset` rejects a version mismatch. These are platform assets to preserve, not missing capabilities to recreate.

`datasets/build.mjs::buildDataset` constructs SQLite from committed extracts or generators, performs integrity and contract checks, tests mutations in a savepoint, verifies foreign keys and rollback row counts, computes SHA-256, compresses assets and writes generated metadata. Preview generation sorts by primary key and limits to twelve rows. **Caveat:** the builder removes prior files for the same domain when writing a new asset. A hashed filename alone therefore does not guarantee indefinite historical availability.

`src/content/index.ts::lessonFixture` attaches per-lesson scenario setup and extra mutations to the canonical dataset. `src/content/question-bank/types.ts` defines equivalent per-question fixture and changed-data fields. `src/content/projects/types.ts` binds projects to canonical domain IDs, and current SQL project helpers construct cumulative SQL setup. This already supports reuse without separate lesson copies.

Python has another mature manifest model in `src/content/python-v2/datasets.ts`: `PyManifest`, per-edition references such as `R01@starter.1`, table relationships and column descriptions, clean/raw layers, profile statistics and quality issues, optional on-demand recipes and explicit file formats. The listed formats include CSV, JSON, JSONL, GeoJSON, Parquet, text and SQLite. `edition` validates the reference against manifest version; `mountsFor` defaults to clean CSV files, requiring explicit selection for additional formats.

`src/engine/python/client.ts` downloads mounts in the page, checks SHA-256, caches by hash and hands bytes to the runner; `PY_MOUNT_LIMIT` is 64 MiB. `public/vendor/engine.js` similarly checks canonical SQL database hashes and isolates database copies. Checksum verification already exists on both execution paths.

## Proposal: one logical registry, multiple physical representations

Use an adapter-produced manifest view before changing either authoring format:

```text
Dataset identity + semantic version
  ├─ provenance, license, generation/source fingerprint
  ├─ logical tables: grain, keys, meanings, units, nullability
  ├─ editions: teaching / full / intentionally dirty / grading variant
  └─ representations
       ├─ SQLite database (SQL)
       ├─ typed CSV + schema / JSON (Python, BI import)
       └─ Parquet (Python, remote Spark, ML)
```

A dataset reference names the domain, version and edition. A representation reference names one byte artifact with checksum, URL, compressed/uncompressed bytes and format. These are distinct concepts: two different file encodings can represent the same table, while a dirty edition is intentionally different data. A teaching sample is not silently interchangeable with the full edition.

Conceptual contract, not implementation:

```text
DatasetRef = { namespace, id, version, edition }
TableContract = { id, grain, fields, primaryKey, foreignKeys, orderingPolicy }
Representation = { format, tables, files, checksum, bytes, compression,
                   schemaFingerprint, transformationVersion }
FixtureRef = { datasetRef, overlayId, overlayVersion, seed, visibility }
```

Do not rename SQL domain IDs or Python registry IDs as part of adopting the view. Namespace existing identities and record explicit equivalences only after comparing provenance and table semantics. Similar domain names are not proof that two datasets contain the same entities or distributions.

## Cross-subject use

A retail analysis can reuse one logical release: SQL queries SQLite, Python reads exported tables, Spark reads partitioned Parquet, Power BI imports typed tables with relationship guidance, and ML uses an explicitly named feature/label split derived from those tables. Each activity references the source release and transformation version. No claim is made that the existing SQL retail and Python retail editions are already interchangeable.

Cross-format parity should be checked at the logical level: keys and row counts, sorted normalized values, null semantics, timestamps/timezones, decimals and units. CSV needs a schema sidecar because inference can turn identifiers into numbers or empty strings into nulls. A byte checksum proves the bytes match, not that Parquet and CSV have equivalent meaning. Preserve intentional dirty-layer faults rather than “repairing” them during export.

For ML, register train/validation/test split identity, split seed or temporal boundary, leakage exclusions and target definition as derived dataset metadata. For BI, include date/grain/relationship contracts; do not pretend a CSV export validates a complete Power BI report. For Spark, record partition/layout metadata where relevant and label browser teaching simulations explicitly rather than implying distributed execution.

## Reproducibility, grading and schema evolution

- Pin activity, dataset, edition, overlay and grading versions in checked evidence. A new dataset release must not silently alter a previous pass.
- Keep learner-visible examples and changed-data variants distinguishable. Existing SQL mutations deter hardcoded answers but are client-visible. Confidential hidden fixtures require server-side grading; browser obfuscation is not confidentiality.
- Deterministic seeds are necessary but insufficient: pin generator/transformation versions, source extract hashes, ordering and runtime-dependent serialization behavior.
- Additive columns may be compatible for explicit-column queries but change `SELECT *` output. Compatibility must be declared per activity contract, not inferred globally from “additive” schema changes.
- Retain referenced old assets for a stated period before content migration; the current builder’s cleanup makes historical retention an explicit future requirement. If retention cannot be guaranteed, preserve source evidence and mark the exact rerun unavailable instead of substituting current data.
- Distinguish manifest integrity, file integrity, database integrity, relational validity and grading correctness. Existing build contracts cover several layers; they do not prove every exercise’s expected answer remains correct.

## Loading, previews and budgets

Keep source metadata and small previews available before engine boot. Show edition, total rows, preview rows, raw/clean status and download size; make clear that queries use full mounted data. Fetch only required representations and files. Cache immutable bytes by hash and bound cache growth.

Do not turn the 64 MiB Python mount ceiling into a promise that every mobile device can process 64 MiB. Compressed transfer size, decompressed bytes, interpreter/packages, multiple in-memory copies, result tables and browser limits all contribute to peak memory. **Unknown:** actual supported-device memory envelope and p95 load/execution times. Define budgets through later benchmark runs using existing `tests/e2e/dataset-benchmarks.mjs` and representative devices, not invented universal limits.

When an edition exceeds a verified browser budget, offer a smaller explicitly named edition or a future remote-capable activity. Do not truncate data invisibly. On checksum mismatch, failed fetch or incompatible schema, fail before grading, keep the draft and distinguish infrastructure failure from an incorrect solution.

## Decisions and acceptance criteria

| Decision | Evidence/problem | Alternatives / tradeoffs | Compatibility, complexity, timing |
|---|---|---|---|
| Metadata adapter over existing registries | Rich SQL and Python manifests already exist but use different identity/edition shapes. | New centralized database service adds deployment and migration cost; no adapter preserves duplication in consumers. | Existing manifests stay authoritative; medium; next. |
| Explicit logical/physical distinction | SQLite assets and multi-format Python editions differ legitimately. | One mandatory format simplifies loaders but weakens subject ergonomics and type fidelity. | Keep sql.js database and Python mounts; medium; next. |
| Version retention policy | SQL builder removes previous per-domain assets; old evidence needs exact reruns. | Keep every release forever costs storage; overwrite destroys reproducibility. | Adopt retention based on referenced curriculum versions; medium; before historical replay is promised. |
| Reuse hash checks and contract generators | Both runtime loaders verify SHA-256; build checks already inspect schema/relationships. | Rewrite provides little demonstrated learner value. | Preserve worker paths and outputs; low; now. |
| Publish measured runtime budgets | Python mount limit exists, but device performance is unmeasured in this audit. | Arbitrary size classes can either block valid work or crash low-memory devices. | No dataset changes; medium measurement work; before larger browser editions. |
| Remote hidden fixtures only when required | Client payloads cannot keep tests secret. | Client checks are inexpensive and sufficient for formative learning; remote checks cost operations. | Keep local formative grading; high for remote; later unless assessment integrity demands it. |

Future acceptance: every loaded representation verifies its hash; referenced old releases resolve or explain retirement; equivalent format fixtures preserve keys/types/null semantics; lessons/practice/projects/labs display the same dataset identity; mutations cannot leak into canonical bytes; infrastructure failures award no failure penalty; existing SQL references and results remain unchanged.
