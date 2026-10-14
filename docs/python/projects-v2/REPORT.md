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

## Learner comprehension review

Reviewed all six project briefs, milestone requirements, starter contracts and their file-loading entry points. This is a heuristic review, not a study with real learners. The previous page described constraints but left prerequisites, file relationships, expected starter errors and the execution sequence implicit. Each project now includes a visible starting guide, task-specific example and prerequisite list. The guide distinguishes milestone checks from executing the full program and final acceptance. Existing placement of task material on the left and editor/output on the right is preserved.

These remain intermediate projects. They assume working knowledge of functions, collection operations and file handling; the analytical projects additionally require dates, plotting and/or pandas. A beginner still needs instruction in those concepts. The guidance improves orientation but does not establish that an unassisted beginner can complete the projects.

## Workspace stages and sizing

The shared workspace now separates Overview, Build, and Test & deliver. Overview uses two equal desktop columns across the available page width; Build defaults to an equal task/editor split with a keyboard- and pointer-adjustable divider. Test & deliver uses the full page width. The redundant Start project button is removed; stage navigation opens Build directly. Smaller screens stack the columns and provide Task, Files, Editor and Tests shortcuts.

Build contains the active milestone, its complete requirements, a function-opening shortcut, persistent file navigation and a dedicated Data view. Input files can be read in full without editing them. Code, console, tests and generated files share the working pane, with adjustable results height. Project acceptance and delivery requirements live in Test & deliver. Completion blockers identify missing checks, stale code, missing artifacts and missing interpretation. The four Customer Data Quality milestones, all other project content, execution engine, grading and storage format are unchanged.

Verification: application TypeScript passed; Chromium Customer Data Quality and Marketplace Analytics passed full execution, downloads, saved progress, reload, and incorrect-submission checks through the new stages. The six-project layout test checks exact equal default columns, full-width reading/delivery stages, file navigation, resizing, mobile shortcuts and responsive sizing. Representative Axe checks found no serious or critical workspace issues.

## Editor scrolling correction

Removed fixed editor/output heights, the Results height slider and the duplicate Go to Test & deliver button. Code and read-only source views expand with their contents, and results occupy only their content height. The page provides scrolling rather than nested editor/results scrollbars. The editor retains a modest minimum writing area for short files. Milestone count is shown only in Build; Overview and Test & deliver omit it. Layout verification now checks these conditions alongside the existing equal-column and responsive checks.

## Delivery clarity and file ordering

Project files now precede the current milestone in Build. Test & deliver groups project-level checks and the delivery package into equal desktop panels, stacked on mobile. Required outputs have individual generated/missing/incomplete/stale statuses beside their downloads. Milestone notices no longer leak into delivery's project-check summary. Verification: TypeScript and all six responsive workspace checks passed; Customer Data Quality also passed cumulative milestone execution, acceptance, actual ZIP delivery, saved progress, reload and incorrect-solution rejection.

## Project entry and selection

The Projects route opens the first project's Overview directly. A compact All projects control in the project header lists the six project names and links each to its Overview, following SQL's project-selection pattern. The catalog detour is removed; individual project URLs and saved work remain unchanged. The Python runtime route gate is preserved. Browser checks cover the entry redirect and switching through every project from this menu.

## Guided milestone editing

Build now presents only the active milestone's function in the editor. Function edits are composed into the existing connected source file; earlier and later functions and imports are retained. Optional saved function ranges preserve temporarily invalid or empty drafts across reloads and adjust when earlier functions change length. Existing full-file drafts load without migration or replacement.

The dropdown is replaced by milestone progress buttons and a gated Continue action. Future steps unlock only after passing the current cumulative check. Earlier steps remain revisitable; edits invalidate the affected step and later progress without deleting code. A successful cumulative check records the prerequisites it proved. Full-program execution remains available in Test & deliver. Overview's Start/Continue action resumes the first unfinished step. File references and supplied tests are grouped separately, and final acceptance criteria appear before running checks.

Validation: Customer Data Quality was built through all four function editors in a browser, with passing milestone checks, saved earlier code, reload during the workflow, and final full-project acceptance. A separate case with missing milestone-1 behavior was rejected at milestone 2 despite a previously saved milestone-1 pass. Responsive checks pass for all six projects; unit tests cover isolated replacement, later-range adjustment, empty/invalid saved snippets, cross-file isolation and assembly of every project's milestone functions.
