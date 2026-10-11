## Why two new datasets

The seven curriculum datasets are small (2–22 rows per table) and each is used by many lessons, so new questions on them would mostly repeat existing reasoning. They also lack:

- a **hierarchy** (self-joins across roles, recursive trees, management chains);
- **interval history with errors** (as-of lookups, overlap validation);
- **order lines with charged prices**, split/missing/over-payments and partial refunds on the same order (fan-out at three grains);
- **daily activity with duplicates and gaps** (streaks, calendar windows);
- **snapshots** to build change history from;
- **duplicates that only appear after normalisation** (case and whitespace in emails).

Reused from the curriculum: the shared changed-data fixture approach, the lab write mode and the validators. Existing datasets were kept unchanged so lesson results and parity tests are unaffected.

## Deliberate edge cases (Harbor Market)

| Case | Where |
| --- | --- |
| Duplicate email only after TRIM/LOWER (`'  ANA@harbor.test '`), exact duplicate (`ben@…`), mixed-case unique email, NULL email | shoppers |
| NULL region; signups on 1 March, 31 March and in April | shoppers |
| Price ties (45 and 89), an item never ordered, an item at exactly 25 | catalog_items |
| Orders on 31 Jan, 1 Feb, 31 Mar, 1 Apr; a day with no orders (14 Mar); a delivered order missing delivered_date; a shipped order outside Feb–Mar | sales_orders |
| A discounted line (unit_price ≠ list price); orders with 1–3 lines | order_lines |
| Split payment, underpayment, overpayment, unpaid shipped/processing orders | order_payments |
| Partial refund, two refunds on one order, full refunds | order_refunds |
| Same-day duplicate logins, streaks crossing a month boundary, equal-length streaks | app_logins |
| Region changes, a return to an earlier region, NULL region runs | shopper_snapshots |

## Deliberate edge cases (Atlas Corp)

| Case | Where |
| --- | --- |
| Two people with no manager (CEO and a contractor); a contractor with no department; a department with no employees | employees, departments |
| Employees earning more than / exactly the same as their manager | employees |
| Salary ties within departments; a department with a single distinct salary; payroll exactly equal to budget | employees, departments |
| Hire dates on 1 Jan and 31 Dec 2023 | employees |
| Half-open salary periods, open-ended current periods, two overlapping periods (bad data), a review on the day a raise starts, a review with no salary history | salary_history, performance_reviews |

## Changed-data fixture

Every question-bank check also runs on a modified copy of the data (`questionBankMutation` + the curriculum's `fixtureMutation`): regions move, a duplicate email is added, new shoppers/orders/lines/payments/refunds/logins appear, prices and salaries change, an employee changes department. The test suite proves that, for every new question, hard-coding the visible output fails.

## Known limitations

- Data is small by design (readable in the result table); performance questions use plans and index structure, not timings.
- SQLite only: no stored procedures, server-specific window syntax or `MEDIAN()`.
- Answers and fixtures are in the browser bundle; grading is educational, not cheat-proof.

## Phase B additions within Harbor Market

- `market_web_events`: 38 raw rows (36 logical events), with duplicate keys, a conflicting retry payload, equal timestamps ordered by id, an exact 30-minute gap, a gap of 30 minutes plus one second, sessions spanning midnight, wrong-order funnels, wrong-cart purchases and later recoveries. Changed data adds successful recovery and conversion paths plus another retry.
- `market_query_log`: schema is shared, but its 12,005-row deterministic archive is populated only for optimization questions via `setupSql`. The shared inventory table therefore shows zero rows for this table. Run, Check, expected examples and previews use the same per-question fixture. Changed data adds rows relevant to every optimization objective. No random data or clock-dependent input is used.
- `market_load_feed` and `market_ledger`: tied versions, stale arrivals and a newer target row. Reruns must be safe; source and target state are both compared with the reference.
- `market_reservation_feed`: duplicate pairs, late invalid retries, NULLs, orphans, fractional quantities and text quantities. `safe_reservations` is created by the learner, not shared between exercises.
- `market_stock`, `market_allocation_feed`, `market_allocation_audit`: rejected and accepted allocations, an untouched item, historical audit data and an additional accepted item on changed data.
- `market_raw_import`: mixed-case/padded codes, malformed digits and delimiters, conflicting email formats including ASCII whitespace, plus aliases, multiple @ symbols, decimal boundaries, signed zero, invalid numeric suffixes and exponent notation.
- qb-0062 uses question-specific extra orders on the existing order-line bridge. Its changed fixture adds a new category and qualifying memberships, exposing hardcoded category counts. Other existing questions do not see these extra orders.

No existing shared table rows were replaced. New source tables and mutations are in `expansion-data.ts`; larger or question-specific additions stay opt-in. All five analytics-case stages reconstruct their own session/funnel/recovery intermediates.
