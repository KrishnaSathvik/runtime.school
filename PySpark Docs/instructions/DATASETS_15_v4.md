# Dataset foundation — all 15 data domains

**Goal:** exactly 15 shared domains, initial schema inventory of 92 tables/streams, used consistently by Learn / Practice / Projects / Tools. Asset counts are proposed (not actual files). Do not ship source data before legal and privacy review.

| ID | Domain | Planned assets | Intended source | Licensing gate |
|---|---|---:|---|---|
| D01 | Retail Commerce | 9 | Olist Brazilian ecommerce (Kaggle), or custom commercial-safe substitute | licensing hold: noncommercial concerns in earlier plan; do not redistribute until vetted |
| D02 | Banking & Payments | 7 | Deterministic generator (ledger balanced by business rules) | fully synthetic, requires invariant checks |
| D03 | Employee & HR | 6 | Employees sample database + synthetic histories | CC BY-SA 3.0 stated by repository; confirm attribution/share-alike integration |
| D04 | Healthcare Operations | 7 | Synthea synthetic patient generator | Apache 2.0 tool; verify output terminology / FHIR notices |
| D05 | Movies & Streaming | 6 | MovieLens research dataset + artificial watch events | commercial use may need permission, varies by dataset version |
| D06 | E-commerce Clickstream | 5 | Deterministic event-stream generator | fully synthetic; nested JSON and event reordering |
| D07 | Transportation & Taxi | 5 | NYC TLC public Parquet trips + taxi zone lookup | verify attribution/reuse and source caveats |
| D08 | Logistics & Supply Chain | 7 | Deterministic logistics/warehouse simulator | synthetic; make CDC timestamps + sequence keys authoritative |
| D09 | IoT & Sensors | 5 | UCI household electricity or other approved sensor data + simulated devices | verify exact dataset license and attribution |
| D10 | Financial Markets | 5 | Licensed market-price API or fully synthetic prices | API terms redistribution/derived data restrictions require approval |
| D11 | Education & Learning | 6 | Original simulation of fictional learner events | fully synthetic; avoid reusing private runtime.school user data |
| D12 | Advertising & Marketing | 6 | Original advertising/conversion simulator | fully synthetic; clear attribution definitions |
| D13 | Weather & Climate | 4 | NOAA public weather station observations and metadata | check specific dataset terms, dates, units and station continuity |
| D14 | Enterprise CRM & ERP | 8 | AdventureWorks OLTP/DW + synthetic CDC/ERP history | verify sample database and redistribution terms |
| D15 | Application Logs | 6 | Synthetic request/log/trace generator | no real secrets or customer identifiers |

## Exact planned schema/table names

- **D01 Retail Commerce:** `customers, orders, order_items, products, payments, returns, sellers, reviews, inventory`
- **D02 Banking & Payments:** `customers, accounts, transactions, transfers, merchants, disputes, ledger_entries`
- **D03 Employee & HR:** `employees, departments, salary_history, promotions, attendance, managers`
- **D04 Healthcare Operations:** `patients, encounters, providers, claims, medications, observations, pharmacies`
- **D05 Movies & Streaming:** `movies, ratings, users, tags, watch_sessions, subscriptions`
- **D06 E-commerce Clickstream:** `page_views, searches, cart_events, checkout_events, sessions`
- **D07 Transportation & Taxi:** `trips, taxi_zones, fare_rules, drivers, weather_enrichment`
- **D08 Logistics & Supply Chain:** `shipments, shipment_events, warehouses, inventory, purchase_orders, suppliers, deliveries`
- **D09 IoT & Sensors:** `devices, sensor_readings, alerts, device_locations, maintenance_events`
- **D10 Financial Markets:** `securities, daily_prices, trades, corporate_actions, market_calendar`
- **D11 Education & Learning:** `learners, courses, lessons, attempts, completions, assessments`
- **D12 Advertising & Marketing:** `campaigns, impressions, clicks, conversions, budgets, attribution_events`
- **D13 Weather & Climate:** `stations, observations, forecasts, weather_alerts`
- **D14 Enterprise CRM & ERP:** `accounts, contacts, invoices, invoice_lines, purchase_orders, suppliers, customer_cdc, product_cdc`
- **D15 Application Logs:** `api_requests, application_logs, traces, deployments, service_metrics, error_events`

## Acquisition and ownership rules

1. Pick an authentic, legally permitted dataset source where valuable; synthetic generation where real records are risky, incomplete or cannot be redistributed.
2. Record immutable source location, retrieved timestamp, license, file checksum, transformation lineage, schema version, and downstream educational uses.
3. Real download does not imply ownership or distribution rights. Original projects cannot silently bundle Kaggle, MovieLens, API data or copyrighted PDF code.
4. Use **deterministic generation** with seeds, stable IDs, temporal/event ordering, referential integrity (except deliberately corrupted fixtures), credible distributions, and domain invariants.
5. Store immutable tiers: `lesson` 5–100 inspectable rows/table, `practice` 100–50K rows/domain for typical correctness, `hidden` separately versioned adversarial fixtures, `project` more substantial, `benchmark` 1M+ only when justified. Sizes are guidelines, not universal requirements.
6. Preserve raw and cleaned views and formats CSV, JSON/JSONL, Parquet, plus Delta, CDC and sequence-of-event-batches where concepts call for them. Do not manufacture streaming semantics by simply renaming static data.
7. Never load project-scale files for an introductory select/filter lesson. Avoid huge input payloads over API: refer to fixture IDs.
8. All question/project results must have separately verified oracles. Test hidden cases with nulls, duplicate rows, ties, orphan foreign keys, out-of-order events, schema evolution, malformed payloads, skew and restarts.
9. File layout labs intentionally include bad and good layouts; partitioning must be evaluated by predicate pruning, cardinality, file sizes and workload, not a magic rule.
10. Prepare dataset descriptions explaining business entities, ER diagrams, constraints, units/time zones, target lessons, questions, projects, tools, and generation scripts.

## Required manifest schema (example)

```yaml
dataset_id: D02
version: 1.0.0
source: synthetic
license_status: cleared
seed: 42
primary_keys: {accounts: [account_id], transactions: [transaction_id]}
foreign_keys: {transactions.account_id: accounts.account_id}
invariants: ["posted transfers balance in ledger", "currency uses exact decimal"]
fixtures: {lesson: small-v1, practice: medium-v1, hidden: hidden-v1, project: project-v1}
```
