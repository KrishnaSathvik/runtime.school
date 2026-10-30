# Canonical projects — latest conversation design (v4)

**This document supersedes the `Projects 10` worksheet in the historical v3 workbook.** Distribution: 3 Beginner, 4 Intermediate, 3 Advanced. Project names/milestones below are proposed curriculum specifications, not finished deployments.

Each project has multiple milestones, prerequisite lessons, reused datasets, testable output contracts, and a reproducible runtime. Projects must be accessible without completing all 90 lessons, but should recommend exact prerequisites.

## P01 — Retail Sales Data Explorer (Beginner)

- **Datasets:** D01
- **Suggested relevant lessons:** L008,L010,L014,L015,L019,L020,L025,L031
- **Real problem:** Clean order data, join order items/products, derive documented net sales, build daily and category marts
- **Deliverables:** clean_orders, daily_sales, category_sales, quality_summary
- **Milestone contract:** business brief & schema tour → initial ingestion → transformations → validation/edge cases → materialized outputs → submission and feedback.
- **Tests required:** schema + multiset equality; null/duplicate/empty-boundary fixtures; domain-specific accounting or history invariants; idempotent rerun for stateful projects.
- **Tool fit:** Playground and Dataset Explorer available at every milestone; SQL Lab/Compare for relational workflows; Performance Lab for P06; Pipeline/Streaming Lab for P07–P10 as needed.

## P02 — Employee & Payroll Analytics (Beginner)

- **Datasets:** D03
- **Suggested relevant lessons:** L007,L012,L021,L027,L033
- **Real problem:** Normalize HR data, self-join reporting hierarchy, compute department payroll and deterministic salary ranks
- **Deliverables:** employee_clean, department_payroll, salary_rankings
- **Milestone contract:** business brief & schema tour → initial ingestion → transformations → validation/edge cases → materialized outputs → submission and feedback.
- **Tests required:** schema + multiset equality; null/duplicate/empty-boundary fixtures; domain-specific accounting or history invariants; idempotent rerun for stateful projects.
- **Tool fit:** Playground and Dataset Explorer available at every milestone; SQL Lab/Compare for relational workflows; Performance Lab for P06; Pipeline/Streaming Lab for P07–P10 as needed.

## P03 — Learning Platform Activity Analytics (Beginner)

- **Datasets:** D11
- **Suggested relevant lessons:** L001,L009,L018,L031,L035
- **Real problem:** Derive attempt counts, completion rates, inactive learners and course progress from event facts
- **Deliverables:** learner_progress, course_completion, inactive_learners
- **Milestone contract:** business brief & schema tour → initial ingestion → transformations → validation/edge cases → materialized outputs → submission and feedback.
- **Tests required:** schema + multiset equality; null/duplicate/empty-boundary fixtures; domain-specific accounting or history invariants; idempotent rerun for stateful projects.
- **Tool fit:** Playground and Dataset Explorer available at every milestone; SQL Lab/Compare for relational workflows; Performance Lab for P06; Pipeline/Streaming Lab for P07–P10 as needed.

## P04 — Banking Transaction Reconciliation (Intermediate)

- **Datasets:** D02
- **Suggested relevant lessons:** L014,L022,L026,L035,L076
- **Real problem:** Validate events, preserve Decimal precision, apply reversals and entries, report account balance discrepancies
- **Deliverables:** reconciled_transactions, account_balances, reconciliation_exceptions
- **Milestone contract:** business brief & schema tour → initial ingestion → transformations → validation/edge cases → materialized outputs → submission and feedback.
- **Tests required:** schema + multiset equality; null/duplicate/empty-boundary fixtures; domain-specific accounting or history invariants; idempotent rerun for stateful projects.
- **Tool fit:** Playground and Dataset Explorer available at every milestone; SQL Lab/Compare for relational workflows; Performance Lab for P06; Pipeline/Streaming Lab for P07–P10 as needed.

## P05 — Movie Recommendation Feature Pipeline (Intermediate)

- **Datasets:** D05
- **Suggested relevant lessons:** L011,L036,L054,L060,L088
- **Real problem:** Clean ratings, compute user/movie features, create leakage-aware time splits, write reproducible outputs
- **Deliverables:** movie_features, user_features, training_interactions
- **Milestone contract:** business brief & schema tour → initial ingestion → transformations → validation/edge cases → materialized outputs → submission and feedback.
- **Tests required:** schema + multiset equality; null/duplicate/empty-boundary fixtures; domain-specific accounting or history invariants; idempotent rerun for stateful projects.
- **Tool fit:** Playground and Dataset Explorer available at every milestone; SQL Lab/Compare for relational workflows; Performance Lab for P06; Pipeline/Streaming Lab for P07–P10 as needed.

## P06 — NYC Taxi Analytics & Performance (Intermediate)

- **Datasets:** D07+D13
- **Suggested relevant lessons:** L018,L045,L055,L056,L057,L058,L080,L085
- **Real problem:** Read actual taxi Parquet, join zone and weather by time/geo rules, benchmark equivalent plans
- **Deliverables:** trip_metrics, zone_demand, weather_trip_analysis, benchmark_report
- **Milestone contract:** business brief & schema tour → initial ingestion → transformations → validation/edge cases → materialized outputs → submission and feedback.
- **Tests required:** schema + multiset equality; null/duplicate/empty-boundary fixtures; domain-specific accounting or history invariants; idempotent rerun for stateful projects.
- **Tool fit:** Playground and Dataset Explorer available at every milestone; SQL Lab/Compare for relational workflows; Performance Lab for P06; Pipeline/Streaming Lab for P07–P10 as needed.

## P07 — Healthcare Claims Lakehouse (Intermediate)

- **Datasets:** D04
- **Suggested relevant lessons:** L013,L023,L038,L065,L073,L078
- **Real problem:** Synthetic encounter/claims Bronze-Silver-Gold ETL, quarantines, contract checks, reliable aggregates
- **Deliverables:** bronze_tables, silver_tables, gold_tables, quality_report
- **Milestone contract:** business brief & schema tour → initial ingestion → transformations → validation/edge cases → materialized outputs → submission and feedback.
- **Tests required:** schema + multiset equality; null/duplicate/empty-boundary fixtures; domain-specific accounting or history invariants; idempotent rerun for stateful projects.
- **Tool fit:** Playground and Dataset Explorer available at every milestone; SQL Lab/Compare for relational workflows; Performance Lab for P06; Pipeline/Streaming Lab for P07–P10 as needed.

## P08 — Logistics CDC & Warehouse History (Advanced)

- **Datasets:** D08+D14
- **Suggested relevant lessons:** L028,L063,L064,L074,L075,L082,L083
- **Real problem:** Ingest ordered CDC inserts/updates/deletes, create Delta MERGE and SCD2 with replay-safe history
- **Deliverables:** shipment_fact, historical_dimensions, cdc_audit, replay_report
- **Milestone contract:** business brief & schema tour → initial ingestion → transformations → validation/edge cases → materialized outputs → submission and feedback.
- **Tests required:** schema + multiset equality; null/duplicate/empty-boundary fixtures; domain-specific accounting or history invariants; idempotent rerun for stateful projects.
- **Tool fit:** Playground and Dataset Explorer available at every milestone; SQL Lab/Compare for relational workflows; Performance Lab for P06; Pipeline/Streaming Lab for P07–P10 as needed.

## P09 — Real-Time Clickstream & Attribution (Advanced)

- **Datasets:** D06+D12
- **Suggested relevant lessons:** L037,L041,L067,L068,L069,L070,L071,L072
- **Real problem:** Parse JSON events, compute sessions/funnels, join campaign data, test late events and checkpoint recovery
- **Deliverables:** session_metrics, funnels, attributed_conversions, recovery_evidence
- **Milestone contract:** business brief & schema tour → initial ingestion → transformations → validation/edge cases → materialized outputs → submission and feedback.
- **Tests required:** schema + multiset equality; null/duplicate/empty-boundary fixtures; domain-specific accounting or history invariants; idempotent rerun for stateful projects.
- **Tool fit:** Playground and Dataset Explorer available at every milestone; SQL Lab/Compare for relational workflows; Performance Lab for P06; Pipeline/Streaming Lab for P07–P10 as needed.

## P10 — IoT Monitoring & Failure Recovery (Advanced)

- **Datasets:** D09+D15
- **Suggested relevant lessons:** L042,L053,L068,L070,L072,L081,L084,L087
- **Real problem:** Stream sensor batches, detect thresholds, correlate with application incidents, test replay and restart
- **Deliverables:** device_health, anomaly_events, incident_summary, recovery_report
- **Milestone contract:** business brief & schema tour → initial ingestion → transformations → validation/edge cases → materialized outputs → submission and feedback.
- **Tests required:** schema + multiset equality; null/duplicate/empty-boundary fixtures; domain-specific accounting or history invariants; idempotent rerun for stateful projects.
- **Tool fit:** Playground and Dataset Explorer available at every milestone; SQL Lab/Compare for relational workflows; Performance Lab for P06; Pipeline/Streaming Lab for P07–P10 as needed.

## Project-specific acceptance criteria

| ID | Extra acceptance gates |
|---|---|
| P01 | Net revenue rules for refunds/status; correct order-item joins and double-counting protection |
| P02 | Manager cycles/missing manager handling; deterministic ties; salary effective dates |
| P03 | Explicit completion denominator and as-of date; multiple attempts/duplicate activity |
| P04 | Debits/credits and reversals balance; Decimal types; no silent monetary tolerance |
| P05 | Temporal train/test split prevents leakage; reproducible feature definitions |
| P06 | Correct taxi/zone/weather joins; plans and repeated benchmarks under controlled resources |
| P07 | Raw provenance retained; quarantine path; input contracts and Delta transactions tested |
| P08 | CDC sequence ordering, deletes, late corrections, SCD2 boundaries, replay idempotency |
| P09 | Deterministic micro-batch arrival, late events, watermark policy, attribution-window definitions, restart results |
| P10 | Stateful recovery, sensor timestamps, suppression of duplicate alert delivery, incident correlation |
