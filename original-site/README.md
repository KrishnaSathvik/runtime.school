# SQL Studio

A static browser-local SQL course with 88 lessons, 176 challenges, 204 curated runnable walkthrough stages, and five guided case-study sequences.

## Learning experience
Ten modules cover foundations, filtering, calculations and data quality, joins and aggregation, dates/strings/subqueries, windows, and advanced product analysis. Seven explicitly fictional databases model a shop, video platform, social product, AI platform, warehouse, CRM/ERP integration project, and disposable lab. Case studies cover DAU, rolling calendar metrics, cohorts and exact-day retention, ordered conversion funnels, deduplication, sessionization, many-to-many join fan-out, experiment conversion, model cost, and invoice/payment/refund reconciliation. Synthetic model rates are not provider prices.

Run query is ungraded. Check answer checks columns, values, duplicates, specified ordering, and a changed-data fixture. Mastery requires two distinct independent challenge solves and a concept check. Guided attempts are practice. Prior mastered lessons from V1 retain credit. Recommendations prioritize repeated mistakes, reviews due after one day, weak concepts, then unseen lessons. Prerequisite buttons offer specific remediation; every lesson stays open. Adaptation is deterministic, not model-generated tutoring.

Walkthroughs are authored example stages, not an explanation engine for arbitrary learner queries. Each stage runs real SQL and displays actual output. Query plan is SQLite EXPLAIN QUERY PLAN. Case-study navigation follows its own lesson sequence.

## Runtime and limits
Bundled sql.js/SQLite runs in a Web Worker with a three-second timeout. Each run recreates teaching data. Query lessons use read-only mode and single-statement parsing. Explicit engineering/warehouse lab lessons and the ungraded Engineering Lab allow up to 60 SQL statements in a fresh in-memory database. Objects, changes, triggers and committed transactions vanish at the end of each run. Lab grading checks required objects, constraints and selected statement requirements; reference answers run in separate fresh databases. Empty SELECT results retain their schema. Results show at most 200 rows; grading compares full results. Frontend values are escaped. No backend, SQL server, API credentials, or paid model is required.

Progress stays in localStorage; drafts stay in sessionStorage. Export/import JSON moves progress manually between browsers. No account/device sync. Dialect-specific functions are labeled. DDL, DML, transactions, views, CTAS/temp tables, indexes and SQLite row triggers now execute in the disposable lab. SQL Server stored procedures, BULK INSERT, clustered/columnstore storage and native table partitioning are conceptual/reference topics and are explicitly not executed or simulated. A dialect guide distinguishes SQLite, T-SQL and PostgreSQL. No live AI service is connected: the AI SQL review lesson is deterministic.

## Checks
node verify.cjs
node verify-engine.cjs
node verify-ui.cjs
node verify-responsive.cjs

All 176 answer queries are verified on base and changed data, and all references and walkthrough queries execute. Additional checks cover exact session boundaries, missing date spines, ranking ties, fan-out inflation, NULL behavior, aliases, duplicates, writes, empty output, and mastery/navigation state.

Managed browser visual/interaction QA was unavailable because the required browser-control skill was not exposed. Deployment and SQL/state validation are checked separately.

Hosting serves dist. SQLite vendor license is in dist/vendor/SQLJS-LICENSE.txt.

The V3 curriculum extension follows the user-supplied analysis of Data With Baraa’s SQL course. Original course files were not imported. Northstar Retail is synthetic. Its Bronze→Silver→Gold workflow uses declared quality rules, stable dimension lookup keys, and an explicit sales-line grain. Sources appear in the Dialect guide.

The Plan Lab executes equivalent queries and real SQLite EXPLAIN QUERY PLAN output, including function-filter vs range and before/after index examples. It makes no production timing or speed-up claims.


Warehouse extension (V4): original CRM/ERP extracts, ingestion manifest, authority-aware integration, product validity intervals, strict calendar validation, reject accounting, named quality gates, durable keys, prebuilt SCD2 as-of queries, version-aware idempotent UPSERT, transactional refresh recovery, grain-safe reporting and an integrated capstone. Projects opens an interactive five-layer blueprint, field catalog and recovery runbook. All 88 lesson IDs are append-only so existing progress remains valid. Validation includes changed-fixture object/state probes and negative warehouse regressions. Server ingestion, actual orchestration/CDC and a complete SCD2 loader are explicitly outside the SQLite demo.


Responsive design (V5): consistent inline SVG icon set, larger reading/code text, 44px+ principal touch targets, white cards and a restrained blue accent. Desktop uses side navigation and split practice panels when space permits; tablets stack the panels. At 960px and below, a safe-area-aware bottom bar and navigation drawer replace the desktop sidebar. Practice uses Understand / Write SQL / Results views with independent schema disclosure. Drafts survive view changes, result completion moves the phone to Results, and feedback can send the learner back to the concept check. Reduced-motion and keyboard focus styles are included. Real device/browser visual QA remains unavailable in the managed environment; DOM/state/SQL and CSS breakpoint structure checks are run.

## SQL Studio V2

The app now starts at Home, with a guided Understand → Practice → Review → Complete lesson flow, dedicated project milestones, persistent drafts, optional SQL placement and light/dark/system themes. All 88 lessons, 176 challenges and five projects remain in the existing course.

See [implementation, audit, routes, verification and limitations](docs/SQL-STUDIO-V2.md). Run `node verify-v2.cjs` and `node verify-design.cjs` in addition to the four existing regression commands. These use real SQLite and VM/CSS checks; they do not substitute for browser/device visual QA.

## Editorial IDE — current design

The current interface uses connected reader/IDE surfaces, numbered module/project indexes, a single progress summary, self-hosted Geist Sans/Mono and Lucide icons. It includes Settings, Cmd/Ctrl + K search, a 64px collapsed rail, five mobile destinations and inline SQL reset. See [the current implementation report](docs/EDITORIAL-IDE.md). Run `node verify-editorial.cjs` for current composition, interaction and token checks; browser/device visual QA is still outstanding.
