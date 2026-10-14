# Python Projects implementation and verification

The six existing project URLs now use connected Python source files, deterministic input datasets, cumulative milestone checks, full acceptance checks, actual generated artifacts and downloadable project archives. The product has one Projects experience: no version labels, revision badges, or separate history panel. Existing saved work remains untouched and older drafts are included in work-in-progress downloads.

Scope: Python Projects only. SQL, Python Learn, independent Practice, and the execution security gate were not modified. Changes are local; nothing was pushed or deployed.

## Project inventory

### Customer Data Quality System

URL: `/python/projects/customer-data-quality`

Editable files: `cleaning.py`, `main.py`.

Inputs: `customers_a.json` (300 records), `customers_b.json` (300 records), `rules.json` (1 records).

Milestones:

1. Normalize without losing evidence
2. Validate and quarantine
3. Reconcile every source position
4. Deliver the complete tool

Deliverables: `clean.json`, `rejected.json`, `quality.json`.

Reference invariants:

```json
{
  "quality.json": {
    "accepted": 443,
    "accounted_for": true,
    "input": 600,
    "reasons": {
      "blocked domain": 42,
      "duplicate email": 36,
      "duplicate id": 13,
      "invalid email": 34,
      "missing field": 32
    },
    "rejected": 157
  }
}
```

### Retail Checkout & Order Processing

URL: `/python/projects/retail-order-engine`

Editable files: `checkout.py`, `main.py`.

Inputs: `catalog.json` (64 records), `carts.json` (48 records), `pricing_rules.json` (1 records).

Milestones:

1. Price a reusable cart
2. Handle the order lifecycle
3. Reconcile sales and refunds
4. Deliver receipts and tested code

Deliverables: `orders.json`, `rejected.json`, `summary.json`, `receipts.txt`.

Reference invariants:

```json
{
  "summary.json": {
    "accepted": 38,
    "accounted_for": true,
    "gross_cents": 905659,
    "input": 48,
    "net_cents": 745377,
    "refunded_cents": 160282,
    "rejected": 10
  }
}
```

### Sales Reporting Pipeline

URL: `/python/projects/csv-sales-analyst`

Editable files: `charts.py`, `main.py`, `reporting.py`.

Inputs: `orders.csv` (1,200 records), `products.csv` (24 records), `payments.csv` (1,067 records), `returns.csv` (82 records).

Milestones:

1. Validate the order source
2. Reconcile payments and returns
3. Prove row and money balances
4. Visualize daily net revenue
5. Deliver a repeatable report

Deliverables: `clean.csv`, `daily_revenue.csv`, `rejected.json`, `quality.json`, `revenue.svg`.

Reference invariants:

```json
{
  "quality.json": {
    "accounted_for": true,
    "balanced": true,
    "clean": 1118,
    "gross_cents": 7461700,
    "input": 1200,
    "net_cents": 7123450,
    "refund_cents": 338250,
    "rejected": 82
  }
}
```

### Product Analytics Investigation

URL: `/python/projects/product-event-investigation`

Editable files: `analytics.py`, `charts.py`, `main.py`.

Inputs: `events.jsonl` (3,025 records), `event_schema.json` (1 records).

Milestones:

1. Establish trustworthy events
2. Reconstruct sessions
3. Measure conversion and retention
4. Visualize weekly activity
5. Deliver reproducible evidence

Deliverables: `summary.json`, `retention.csv`, `rejected.json`, `quality.json`, `activity.svg`.

Reference invariants:

```json
{
  "quality.json": {
    "accepted": 2943,
    "accounted_for": true,
    "input": 3025,
    "reasons": {
      "duplicate": 42,
      "invalid": 40
    },
    "rejected": 82
  },
  "summary.json": {
    "abandoned_sessions": 309,
    "converted_sessions": 504,
    "events": 2943,
    "sessions": 813,
    "users": 140,
    "viewed_sessions": 813,
    "weekly": [
      {
        "active_users": 47,
        "events": 141,
        "week": "2026-01-05"
      },
      {
        "active_users": 85,
        "events": 335,
        "week": "2026-01-12"
      },
      {
        "active_users": 121,
        "events": 440,
        "week": "2026-01-19"
      },
      {
        "active_users": 112,
        "events": 405,
        "week": "2026-01-26"
      },
      {
        "active_users": 112,
        "events": 406,
        "week": "2026-02-02"
      },
      {
        "active_users": 112,
        "events": 405,
        "week": "2026-02-09"
      },
      {
        "active_users": 112,
        "events": 405,
        "week": "2026-02-16"
      },
      {
        "active_users": 112,
        "events": 406,
        "week": "2026-02-23"
      }
    ]
  }
}
```

### Marketplace Analytics

URL: `/python/projects/marketplace-eda`

Editable files: `analysis.py`, `charts.py`, `main.py`.

Inputs: `orders.csv` (2,441 records), `customers.csv` (240 records), `products.csv` (32 records).

Milestones:

1. Clean without erasing the source
2. Join without losing revenue
3. Measure customer and cohort behavior
4. Chart cohort revenue
5. Deliver analysis with limitations

Deliverables: `cleaned.csv`, `cohorts.csv`, `findings.json`, `cohorts.svg`.

Reference invariants:

```json
{
  "findings.json": {
    "customers": 238,
    "median_order_cents": 10200.0,
    "orders": 2278,
    "repeat_customers": 181,
    "revenue_cents": 22749800,
    "unknown_customer_orders": 43,
    "unknown_product_orders": 35
  }
}
```

### Incremental ETL Pipeline

URL: `/python/projects/reliable-mini-etl`

Editable files: `main.py`, `pipeline.py`.

Inputs: `batch_a.jsonl` (500 records), `batch_b.jsonl` (500 records), `batch_c.jsonl` (500 records), `existing.csv` (200 records), `schema.json` (1 records).

Milestones:

1. Parse batches with traceable errors
2. Enforce the data contract
3. Apply deterministic updates
4. Prove replay and reconciliation
5. Deliver the pipeline and manifest

Deliverables: `output.csv`, `rejected.json`, `manifest.json`.

Reference invariants:

```json
{
  "manifest.json": {
    "accepted": 1331,
    "accounted_for": true,
    "output_rows": 420,
    "rejected": 169,
    "replay_ok": true,
    "schema_version": 1,
    "source_lines": 1500,
    "total_cents": 2144555
  }
}
```

## Verification

- Application TypeScript check passed using the scoped application configuration.
- 29 targeted Vitest tests passed (project state/archive behavior and existing Python client/security gate).
- All six native reference implementations passed all 28 milestone checks. Broken function mutations and unfinished starters were rejected for every project.
- Chromium executed all six reference implementations, captured required artifacts, downloaded ZIPs, preserved existing storage, retained completion after reload, and rejected edited/incorrect submissions.
- All seven pages (catalog and six projects) passed version-label and horizontal-overflow checks at 1365, 600, 390 and 360 pixels.
- Ten actual browser archives were validated for ZIP integrity, source contents, acceptance evidence and executable exported tests. Detailed results: [verification.json](verification.json).
- Firefox Customer Data Quality passed execution, cumulative milestone checks, downloads, persistence, mobile sizing and incorrect-submission checks. Firefox Marketplace Analytics and WebKit Customer Data Quality also passed. The initial WebKit Marketplace assertion raced the asynchronous persistence effect despite all five UI checks passing; the test now waits for storage to settle. A repeat passed reference execution, ZIP download and reload persistence, but timed out waiting for the later incorrect-submission result; that WebKit negative-case check is not claimed as passing.

Current screenshots: [desktop](screens/current-project-desktop.png), [phone](screens/current-project-mobile.png). Other screenshots document execution checks and may predate the final removal of revision labels.

## Research and limits

Implementation follows [Pyodide filesystem guidance](https://pyodide.org/en/stable/usage/accessing-files.html) and [Python unittest](https://docs.python.org/3.12/library/unittest.html). Inputs are synthetic and reproducible. Numeric CSV/JSON artifacts are checked by normalized content; chart checks verify a generated, nonempty SVG, not its visual quality. Written interpretations are required only for analytical projects and are not automatically checked for factual accuracy. Editable filenames are the supplied project modules. Browser checks are learning feedback, not tamper-resistant certification. File capture limits still apply and incomplete artifacts cannot qualify for delivery.

Implementation commits: `c54b86a`, `1fbaac8`; final UI cleanup and verification are in the subsequent local commit.

## Final layout correction

Project instructions, file navigation, input previews, generated artifacts and delivery controls are in the left column. The right column contains only editable Python, execution controls and terminal/check output. Input samples are visible by default; generation machinery is removed from the learner task view. Data selection previews on the left without replacing code. Tables align fields on desktop and become labeled records on narrow phones. Desktop uses equal columns with a sticky workspace; smaller screens stack naturally without nested editor scrolling.

The six-project layout test verifies file placement, always-visible inputs, preserved editor contents when inspecting data, and no horizontal overflow at 1365, 600, 390 and 360 pixels. The representative workspace passes Axe with no serious or critical violations.
