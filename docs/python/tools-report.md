# Python tools: delivery report

Status as of 2026-10-18. Everything below is implemented and was executed for real (Pyodide 314.0.7 in Node for
content tests; Chromium against `next dev` for the browser checks). Nothing is committed, pushed or deployed.
Python stays off on every Vercel deploy (`src/platform/python-runner.ts`).

## Layout

All five Python tools use the SQL tools' layout and components: the `rx-task-split` brief (amber tagline, title,
one-sentence description, labelled selects, the selected item's heading, `what you'll try / what you should see`,
tables involved, table cards, how it works) on the left; SQL's code cell (name, ⌘↵ hint, Run bottom right, output in
the `rx-out` result box) on the right; and the amber status line. Playground mirrors SQL Playground, Database Lab
mirrors SQL Database Lab, Performance Lab mirrors Query Performance (results as an `rx-compare` table), Compare
Approaches mirrors Compare Syntax, and Datasets uses the SQL Playground dataset side plus a live explore cell.
Shared parts: `src/features/python/ToolParts.tsx`.

## Runtime changes

- Vendored and hash-verified three more packages from the pinned Pyodide release: **Polars 1.33**, **PyArrow 22**,
  **tzdata** (`scripts/copy-pyodide.mjs`, worker `PACKAGE_SETS`). They load only when code imports them.
- Harness: programs can run as any entry file; tracebacks include every learner file (`helpers.py`, …) and the
  error reports which file it's in; `display()` now renders pandas and Polars DataFrames/Series and 1-D/2-D NumPy
  arrays as tables, and pretty-prints lists/dicts.
- Library detection follows the running file and the workspace modules it imports (`programCode`), and adds
  pandas for DuckDB `.df()`, PyArrow for Parquet and Polars→pandas, tzdata for `zoneinfo`.
- Runner isolation re-verified: `tests/e2e/python-isolation.mjs chromium` → `ok` (no exfiltration, no app storage).

**Unsupported, and said so in the UI when hit:** packages not in the runtime (named in a note: `requests`, …),
network access, `pip install`, `asyncio.run()` (needs WebAssembly stack switching this runtime can't rely on),
threads/processes for real parallelism. Polars in this Pyodide build has no Parquet/JSON readers or `scan_*`.

## Datasets: 15 families ready

| | Name in tools | Kind | Source / licence | Formats |
|---|---|---|---|---|
| R01 | Online Store | fictional | Runtime | CSV, raw CSV, Parquet |
| R02 | Movies | fictional | Runtime (replaces MovieLens: redistribution limits) | CSV, raw CSV, Parquet |
| D02 | Online Retail | real | UCI Online Retail II, CC BY 4.0 | CSV, Parquet |
| D03 | Consumer Complaints | real | CFPB API, public domain | CSV, JSONL, API responses |
| D05 | Rentals | fictional | Runtime (replaces Inside Airbnb: host personal data, per-city terms) | CSV, Parquet |
| D06 | NYC Taxi Trips | real | NYC TLC, NYC Open Data terms | CSV, Parquet |
| D07 | Daily Weather | real | NOAA GHCN-Daily, public domain | CSV, Parquet |
| D08 | Earthquakes | real | USGS FDSN API, public domain | CSV, GeoJSON, paged API JSON, Parquet |
| D09 | Food Products | real | Open Food Facts, ODbL | CSV, JSON, JSONL |
| D10 | Research Papers | real | OpenAlex API, CC0 | CSV, JSONL, API pages |
| D11 | Repository Events | fictional | Runtime (replaces GH Archive: user e-mails) | CSV, hourly/daily JSONL |
| D12 | Q&A Forum | fictional | Runtime (replaces Stack Exchange: CC BY-SA + dump terms) | CSV, Posts.xml |
| D13 | Flights | real | BTS on-time data, public domain | CSV, Parquet |
| D14 | City Map | real | OpenStreetMap (Overpass), ODbL | CSV, GeoJSON, Overpass JSON |
| D15 | Exoplanets | real | NASA Exoplanet Archive | CSV, Parquet |

- Real sources are acquired once by `datasets/python/<id>/acquire.mjs` into committed gzip extracts with
  `source.json` provenance; D02/D06/D13 reuse the SQL datasets' pinned extracts (without the SQL teaching edits).
  `npm run datasets:python` is offline and deterministic (`--check` passes); published file URLs are immutable.
- Known limits of the real data: CFPB's API no longer returns consumer narratives, so D03 has none (nothing
  invented). Open Food Facts' search service doesn't index ingredients text, additives or serving size.
- Every edition records its real quality issues with counts (e.g. Online Retail full: 1,996 cancellations, 31,144
  anonymous lines, 1,406 duplicate lines). Generated datasets also ship a messy `raw/` export where defined.
- Coverage of actual use: `docs/python/coverage.md` → “What actually uses each dataset”. Honest gap: authored
  lessons and practice questions use inline data and mount no dataset yet; P01 and P03 mount theirs, the other
  projects name a dataset but ship their own sample files.

## Playground

Multi-file workspace (create, rename, delete, up to 20 files), run any `.py` file, imports between files, autosave
in this browser (migrates the old single draft), download own files as .zip. Dataset selector with
size, a file browser grouped by folder and format, a contained preview (CSV table, JSON structure, JSONL records,
XML, Parquet schema), copy path, insert loading code. Output tabs: Output, Tables, Charts, Files (keep written files
in the workspace), Problems; click-to-line errors across files. **23 starters** in 5 groups, all tested.

## Database Lab

Prepared environments built on first open into a writable SQLite file kept in the browser: **Online Store,
Movies, Weather, Flights** (Medium size) plus an empty database. Status lines name only the tool, the dataset and "runs in your browser". Schema explorer (row counts, PK/FK, indexes,
browse rows), Python tab (default) and SQL tab on the same file, real query plans, “Database changed” summary after
Python runs, reset to original data. **19 activities** in 4 groups (inspect schema, cursors, order lookup,
parameters vs f-strings, pandas read_sql, window functions, CRUD + rowcount, transactions with rollback,
constraints incl. foreign keys, upsert, bulk insert timing, index experiment with plans, fetchmany memory,
reconciliation, CSV load, CSV export, DuckDB analytics). Each runs on every environment it lists.

## Performance Lab

**49 experiments, all executable and validated** at default and smallest inputs (results must match before any
timing is shown): Iteration and collections 11, Functions and algorithms 9, Memory 7, Data processing 11,
Files and I/O 5, Real-world optimization 6. Each declares its own inputs (sizes, lookup counts, hit rates,
distributions, dataset sizes; advanced inputs hidden by default). Measurement: correctness check, warmup,
7 alternating timed runs with GC paused, median, spread band, tracemalloc peak, library versions, setup shown;
optional cProfile view; per-session run history to see scaling; open in Playground. Wording never names a universal
winner and reports “no clear difference” when the gap is within run-to-run variation.

## Compare Approaches

**77 comparisons, all with working code checked in Pyodide**: Fundamentals 14, Collections 13, Functions and
classes 14, Files and structured data 12, Data manipulation 13, Advanced Python 11. 20 have three approaches.
49 must print identical output (verified); 28 intentionally differ to show a semantic difference (verified to
differ). Each has the problem, approaches with when-to-use, differences, edge cases, concepts, related links and
lesson links; searchable category browser; runs automatically on open; send any approach to Playground.

## Tests

| Suite | Result |
|---|---|
| `tests/python-datasets-catalog.test.ts` (15 datasets on disk + loaders per format) | 43 passed |
| `tests/python-datasets.test.ts` | 11 passed |
| `tests/python-playground.test.ts` (starters, helpers, worker parses) | 30 passed |
| `tests/python-lab.test.ts` (environments + every activity × environment) | 34 passed |
| `tests/python-performance.test.ts` (49 × 2 input sets + profiling) | 100 passed |
| `tests/python-compare.test.ts` (77 comparisons + catalogue) | 78 passed |
| Full `vitest run` (incl. SQL) | 4,510 passed, 1 failed under load (PY-L31-01, passes alone; its file re-run: 1,802/1,802) |
| `tests/e2e/python-isolation.mjs chromium` | ok |
| Browser (Chromium, 1440×900 and 390×844) | Playground, Datasets, Database Lab, Performance Lab, Comparator exercised end to end |

## Known issues

- Fresh interpreter per run: the first run that loads pandas/Polars takes several seconds; the Comparator runs
  approaches one after another, so a three-approach pandas comparison takes a few seconds to fill in.
- Browser timers are coarse (≈0.1 ms); very fast experiments show quantised times (the report says so).
- Pre-existing, not from this work: `tsc` errors in some `src/content/python-v2/questions/M2x.ts` files and
  `projects/step.ts`; one lint error in `Project.tsx` (unescaped apostrophe).
