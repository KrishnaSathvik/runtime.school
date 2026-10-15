import type { CanonicalDatasetId } from "@/data/datasets/learning-map";
import { CENTRAL_TABLE, datasetName, TOOL_DATASETS } from "./datasets";

export type LabGroup = "core" | "contracts" | "engineering" | "warehouse" | "free";

export const LAB_GROUPS: Array<{ id: LabGroup; label: string }> = [
  { id: "core", label: "Core database operations" },
  { id: "contracts", label: "Data contracts" },
  { id: "engineering", label: "Data engineering" },
  { id: "warehouse", label: "Warehouse" },
  { id: "free", label: "Your own script" },
];

/** One experiment on one dataset. `variant` is a version that breaks a rule on purpose and must fail. */
export type LabScript = {
  tryThis: string;
  observe: string;
  sql: string;
  variant?: { label: string; sql: string; observe: string };
};

export type LabExperiment = {
  id: string;
  group: LabGroup;
  title: string;
  summary: string;
  scripts: Partial<Record<CanonicalDatasetId, LabScript>>;
};

/** Inserts one statement before the script's final SELECT, for variants that break a rule. */
function beforeLast(sql: string, statement: string) {
  const at = sql.lastIndexOf("\nSELECT");
  return `${sql.slice(0, at)}\n${statement}${sql.slice(at)}`;
}
function broken(script: Omit<LabScript, "variant">, label: string, statement: string, observe: string): LabScript {
  return { ...script, variant: { label, sql: beforeLast(script.sql, statement), observe } };
}

export const labExperiments: LabExperiment[] = [
  // ───────────── Core database operations
  {
    id: "create-table", group: "core", title: "Create a table",
    summary: "Define a table with typed columns, a primary key, required values and a link to an existing table.",
    scripts: {
      retail: {
        tryThis: "Create a customer_notes table linked to customers, then read its column definitions back from the database.",
        observe: "One row per column: note_id is the primary key, customer_id and note are required (not_null = 1), and created_at defaults to the current time.",
        sql: `CREATE TABLE customer_notes (
  note_id INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers (customer_id),
  note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SELECT name, type, "notnull" AS not_null, dflt_value AS default_value, pk
FROM pragma_table_info('customer_notes');`,
      },
      healthcare: {
        tryThis: "Create a care_plans table for patients, then read the stored definition back from sqlite_schema.",
        observe: "The result is the CREATE TABLE statement exactly as SQLite stored it, including the foreign key to patients and the default status.",
        sql: `CREATE TABLE care_plans (
  care_plan_id INTEGER PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients (patient_id),
  goal TEXT NOT NULL,
  review_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
);
SELECT name, sql
FROM sqlite_schema
WHERE name = 'care_plans';`,
      },
      sports: {
        tryThis: "Create a player_awards table, record the 2025 home-run leader in it, and join it back to players.",
        observe: "One award row, joined to the player's name. The award points at real players and seasons rows through its foreign keys.",
        sql: `CREATE TABLE player_awards (
  award_id INTEGER PRIMARY KEY,
  player_id TEXT NOT NULL REFERENCES players (player_id),
  season INTEGER NOT NULL REFERENCES seasons (season),
  award TEXT NOT NULL
);
INSERT INTO player_awards (player_id, season, award)
SELECT player_id, 2025, 'Home run leader'
FROM player_game_stats
GROUP BY player_id
ORDER BY SUM(home_runs) DESC
LIMIT 1;
SELECT a.award, a.season, p.first_name, p.last_name
FROM player_awards AS a
JOIN players AS p USING (player_id);`,
      },
    },
  },
  {
    id: "alter-table", group: "core", title: "Alter a table",
    summary: "Add a column to a table that already holds data, then fill it from other tables.",
    scripts: {
      retail: {
        tryThis: "Add a loyalty_tier column to customers and fill it from each customer's number of sale invoices.",
        observe: "Every existing customer now has a tier. Most are standard; a few frequent buyers reach silver or gold.",
        sql: `ALTER TABLE customers ADD COLUMN loyalty_tier TEXT;
UPDATE customers
SET loyalty_tier = CASE
  WHEN (SELECT COUNT(*) FROM orders AS o
        WHERE o.customer_id = customers.customer_id AND o.order_type = 'sale') >= 20 THEN 'gold'
  WHEN (SELECT COUNT(*) FROM orders AS o
        WHERE o.customer_id = customers.customer_id AND o.order_type = 'sale') >= 5 THEN 'silver'
  ELSE 'standard'
END;
SELECT loyalty_tier, COUNT(*) AS customers
FROM customers
GROUP BY loyalty_tier
ORDER BY customers DESC;`,
      },
      developer: {
        tryThis: "Add an is_critical flag to repositories with a default, then mark repositories that have had a sev1 incident.",
        observe: "The new column starts at 0 for all 512 repositories (the DEFAULT); the UPDATE sets it to 1 for the repositories with sev1 incidents.",
        sql: `ALTER TABLE repositories ADD COLUMN is_critical INTEGER NOT NULL DEFAULT 0;
UPDATE repositories
SET is_critical = 1
WHERE repository_id IN (SELECT repository_id FROM incidents WHERE severity = 'sev1');
SELECT is_critical, COUNT(*) AS repositories
FROM repositories
GROUP BY is_critical;`,
      },
    },
  },
  {
    id: "insert", group: "core", title: "Insert records",
    summary: "Add rows to existing tables, including a row that depends on a row inserted just before it.",
    scripts: {
      retail: {
        tryThis: "Insert a new customer, an invoice for them and one invoice line priced from the product catalog.",
        observe: "The new invoice X900001 appears with its customer's country and one line for product 85123A at its list price.",
        sql: `INSERT INTO customers (customer_id, country, region, first_order_at)
VALUES (99001, 'Portugal', 'Europe', '2011-12-10 09:00:00');
INSERT INTO orders (invoice_no, customer_id, ordered_at, country, order_type)
VALUES ('X900001', 99001, '2011-12-10 09:00:00', 'Portugal', 'sale');
INSERT INTO order_items (order_id, line_number, stock_code, description, quantity, unit_price)
SELECT (SELECT order_id FROM orders WHERE invoice_no = 'X900001'), 1, stock_code, description, 12, list_price
FROM products
WHERE stock_code = '85123A';
SELECT o.order_id, o.invoice_no, c.country, oi.stock_code, oi.quantity, oi.unit_price
FROM orders AS o
JOIN customers AS c USING (customer_id)
JOIN order_items AS oi USING (order_id)
WHERE o.invoice_no = 'X900001';`,
      },
      logistics: {
        tryThis: "Insert a new carrier, then a linehaul route that uses the carrier id SQLite just assigned.",
        observe: "The new route is joined to the new carrier. last_insert_rowid() returned the carrier's automatically assigned id.",
        sql: `INSERT INTO carriers (carrier_name, carrier_type, on_time_target_pct)
VALUES ('Ridgeway Linehaul', 'regional', 94);
INSERT INTO routes (origin_warehouse_id, destination_warehouse_id, carrier_id, typical_transit_hours, distance_miles)
VALUES (1, 2, last_insert_rowid(), 18, 640);
SELECT r.route_id, c.carrier_id, c.carrier_name, r.origin_warehouse_id, r.destination_warehouse_id, r.typical_transit_hours
FROM routes AS r
JOIN carriers AS c USING (carrier_id)
WHERE c.carrier_name = 'Ridgeway Linehaul';`,
      },
    },
  },
  {
    id: "update", group: "core", title: "Update records",
    summary: "Change existing rows with UPDATE, and see exactly which rows the WHERE clause touched.",
    scripts: {
      retail: {
        tryThis: "Raise list prices by 5% in the Kitchen & Dining category, keeping the old prices to compare. Then remove the WHERE clause and run again.",
        observe: "Each Kitchen & Dining product shows its old and new price. Without WHERE, every product in the catalog would change.",
        sql: `CREATE TEMP TABLE old_prices AS
SELECT stock_code, list_price FROM products WHERE category_id = 3;
UPDATE products
SET list_price = ROUND(list_price * 1.05, 2)
WHERE category_id = 3;
SELECT p.stock_code, p.description, o.list_price AS old_price, p.list_price AS new_price
FROM products AS p
JOIN old_prices AS o USING (stock_code)
ORDER BY p.stock_code
LIMIT 20;`,
      },
      healthcare: {
        tryThis: "Cancel every still-scheduled appointment for Family Medicine clinicians, then count appointment statuses for them.",
        observe: "Only appointments that were 'scheduled' change to 'cancelled'; completed and no-show history is untouched.",
        sql: `UPDATE appointments
SET status = 'cancelled'
WHERE status = 'scheduled'
  AND provider_id IN (SELECT provider_id FROM providers WHERE specialty = 'Family Medicine');
SELECT a.status, COUNT(*) AS appointments
FROM appointments AS a
JOIN providers AS p USING (provider_id)
WHERE p.specialty = 'Family Medicine'
GROUP BY a.status
ORDER BY appointments DESC;`,
      },
    },
  },
  {
    id: "delete", group: "core", title: "Delete records",
    summary: "Remove rows with DELETE, and see foreign keys stop a delete that would orphan other rows.",
    scripts: {
      retail: broken({
        tryThis: "Delete failed payment attempts and count what remains. Then try deleting a customer who still has invoices.",
        observe: "The failed payments are gone; captured payments remain.",
        sql: `DELETE FROM payments
WHERE status = 'failed';
SELECT status, COUNT(*) AS payments
FROM payments
GROUP BY status;`,
      }, "Delete a customer with invoices", "DELETE FROM customers WHERE customer_id = 13093;",
      "FOREIGN KEY constraint failed: orders still point at customer 13093, so SQLite refuses the delete. Nothing after the failing statement ran."),
      iot: {
        tryThis: "Delete readings that devices flagged as faults, then count readings by quality flag.",
        observe: "No 'fault' rows remain; 'ok' and 'out_of_range' readings are unchanged.",
        sql: `DELETE FROM sensor_readings
WHERE quality_flag = 'fault';
SELECT quality_flag, COUNT(*) AS readings
FROM sensor_readings
GROUP BY quality_flag;`,
      },
    },
  },
  {
    id: "view", group: "core", title: "Create a view",
    summary: "Save a query under a name and query it like a table. A view stores the query, not the rows.",
    scripts: {
      retail: {
        tryThis: "Create a customer_sales view that totals each identified customer's invoice lines, then query the top ten.",
        observe: "The view behaves like a table with one row per customer. Change the data and the view reflects it the next time it is queried.",
        sql: `CREATE VIEW customer_sales AS
SELECT o.customer_id,
       COUNT(DISTINCT o.order_id) AS invoices,
       ROUND(SUM(oi.quantity * oi.unit_price), 2) AS net_sales
FROM orders AS o
JOIN order_items AS oi USING (order_id)
WHERE o.customer_id IS NOT NULL
GROUP BY o.customer_id;
SELECT *
FROM customer_sales
ORDER BY net_sales DESC
LIMIT 10;`,
      },
      flights: {
        tryThis: "Create a route_delays view over completed flights, then find the busiest routes with the worst average arrival delay.",
        observe: "Ten routes with at least 100 completed flights, ordered by average arrival delay in minutes.",
        sql: `CREATE VIEW route_delays AS
SELECT origin, destination,
       COUNT(*) AS flights,
       ROUND(AVG(arrival_delay), 1) AS avg_arrival_delay
FROM flights
WHERE cancelled = 0 AND diverted = 0
GROUP BY origin, destination;
SELECT *
FROM route_delays
WHERE flights >= 100
ORDER BY avg_arrival_delay DESC
LIMIT 10;`,
      },
      saas: {
        tryThis: "Create a daily_active_users view from raw events, then read the last two weeks.",
        observe: "One row per day with the number of distinct users who produced any event that day.",
        sql: `CREATE VIEW daily_active_users AS
SELECT date(occurred_at) AS day, COUNT(DISTINCT user_id) AS active_users
FROM events
GROUP BY date(occurred_at);
SELECT *
FROM daily_active_users
ORDER BY day DESC
LIMIT 14;`,
      },
      mobility: {
        tryThis: "Create a zone_daily_pickups view joining trips to zone names, then look at Valentine's Day.",
        observe: "The busiest pickup zones on 14 February 2025, with trip counts and fare revenue.",
        sql: `CREATE VIEW zone_daily_pickups AS
SELECT z.zone_name, date(t.pickup_at) AS day,
       COUNT(*) AS trips,
       ROUND(SUM(t.total_amount), 2) AS revenue
FROM trips AS t
JOIN zones AS z ON z.zone_id = t.pickup_zone_id
GROUP BY z.zone_name, date(t.pickup_at);
SELECT *
FROM zone_daily_pickups
WHERE day = '2025-02-14'
ORDER BY trips DESC
LIMIT 10;`,
      },
      healthcare: {
        tryThis: "Create a patient_last_visit view, then list patients whose last visit was an emergency.",
        observe: "Patients whose most recent encounter was in the emergency department, newest first.",
        sql: `CREATE VIEW patient_last_visit AS
SELECT patient_id, MAX(start_at) AS last_visit_at
FROM encounters
GROUP BY patient_id;
SELECT v.patient_id, v.last_visit_at, e.encounter_class
FROM patient_last_visit AS v
JOIN encounters AS e ON e.patient_id = v.patient_id AND e.start_at = v.last_visit_at
WHERE e.encounter_class = 'emergency'
ORDER BY v.last_visit_at DESC
LIMIT 10;`,
      },
      developer: {
        tryThis: "Create a merged_pr_hours view, then compare average time to merge across the busiest repositories.",
        observe: "Repositories with the most merged pull requests and their average hours from opening to merge.",
        sql: `CREATE VIEW merged_pr_hours AS
SELECT pull_request_id, repository_id,
       ROUND((julianday(merged_at) - julianday(created_at)) * 24, 1) AS hours_to_merge
FROM pull_requests
WHERE merged_at IS NOT NULL;
SELECT repository_id, COUNT(*) AS merged, ROUND(AVG(hours_to_merge), 1) AS avg_hours
FROM merged_pr_hours
GROUP BY repository_id
ORDER BY merged DESC
LIMIT 10;`,
      },
      sports: {
        tryThis: "Create a team_season_records view from game scores, then show the 2025 standings by wins.",
        observe: "Each 2025 club's wins and losses computed from regular-season scores, best record first.",
        sql: `CREATE VIEW team_season_records AS
SELECT season, team_id,
       SUM(won) AS wins,
       SUM(1 - won) AS losses
FROM (
  SELECT season, home_team_id AS team_id, home_score > away_score AS won FROM games WHERE game_type = 'regular'
  UNION ALL
  SELECT season, away_team_id, away_score > home_score FROM games WHERE game_type = 'regular'
)
GROUP BY season, team_id;
SELECT team_id, wins, losses
FROM team_season_records
WHERE season = 2025
ORDER BY wins DESC, team_id
LIMIT 10;`,
      },
    },
  },
  {
    id: "index", group: "core", title: "Create an index",
    summary: "Build an index, then read EXPLAIN QUERY PLAN to see SQLite use it.",
    scripts: {
      retail: {
        tryThis: "Index orders by (country, ordered_at), then ask for the plan of a country-and-date query. Delete the CREATE INDEX line and run again to compare.",
        observe: "The plan reads SEARCH orders USING INDEX idx_orders_country_time (country=? AND ordered_at>?). Without the index SQLite picks a different path.",
        sql: `CREATE INDEX idx_orders_country_time ON orders (country, ordered_at);
EXPLAIN QUERY PLAN
SELECT invoice_no, ordered_at
FROM orders
WHERE country = 'France' AND ordered_at >= '2011-01-01'
ORDER BY ordered_at;`,
      },
      flights: {
        tryThis: "Index flights by (airline_code, flight_date), then explain a one-airline, one-week query. Remove the index line to compare.",
        observe: "The plan searches the new index on both columns and needs no separate step to find the week.",
        sql: `CREATE INDEX idx_flights_airline_date ON flights (airline_code, flight_date);
EXPLAIN QUERY PLAN
SELECT flight_date, COUNT(*) AS flights, AVG(arrival_delay) AS avg_delay
FROM flights
WHERE airline_code = 'WN' AND flight_date BETWEEN '2025-03-01' AND '2025-03-07'
GROUP BY flight_date;`,
      },
      saas: {
        tryThis: "Index events by (event_name, occurred_at), then explain a count of one event type in one month.",
        observe: "SEARCH events USING COVERING INDEX: the count is answered from the index alone.",
        sql: `CREATE INDEX idx_events_name_time ON events (event_name, occurred_at);
EXPLAIN QUERY PLAN
SELECT COUNT(*)
FROM events
WHERE event_name = 'report_shared' AND occurred_at >= '2025-05-01' AND occurred_at < '2025-06-01';`,
      },
      mobility: {
        tryThis: "Index trips by (pickup_zone_id, pickup_at), then explain a one-zone, one-day query.",
        observe: "The plan searches the new index with both the zone and the time range.",
        sql: `CREATE INDEX idx_trips_zone_time ON trips (pickup_zone_id, pickup_at);
EXPLAIN QUERY PLAN
SELECT COUNT(*), AVG(tip_amount)
FROM trips
WHERE pickup_zone_id = 161 AND pickup_at >= '2025-03-14' AND pickup_at < '2025-03-15';`,
      },
      energy: {
        tryThis: "Index interchange by the receiving authority and date, then explain a query for flows into one authority.",
        observe: "The plan searches the new index instead of scanning every directed pair.",
        sql: `CREATE INDEX idx_interchange_to_date ON interchange (to_ba, date);
EXPLAIN QUERY PLAN
SELECT from_ba, SUM(interchange_mwh) AS mwh
FROM interchange
WHERE to_ba = 'CISO' AND date BETWEEN '2024-06-01' AND '2024-06-30'
GROUP BY from_ba;`,
      },
      iot: {
        tryThis: "Index alerts by (severity, opened_at), then explain a query for recent critical alerts.",
        observe: "The plan searches the new index by severity and time instead of scanning every alert.",
        sql: `CREATE INDEX idx_alerts_severity_opened ON alerts (severity, opened_at);
EXPLAIN QUERY PLAN
SELECT alert_id, device_id, opened_at
FROM alerts
WHERE severity = 'critical' AND opened_at >= '2025-04-15'
ORDER BY opened_at;`,
      },
      developer: {
        tryThis: "Index reviews by (reviewer_id, submitted_at), then explain one reviewer's recent reviews.",
        observe: "The plan searches the new index and needs no temporary sort for ORDER BY submitted_at.",
        sql: `CREATE INDEX idx_reviews_reviewer_time ON reviews (reviewer_id, submitted_at);
EXPLAIN QUERY PLAN
SELECT pull_request_id, state, submitted_at
FROM reviews
WHERE reviewer_id = 42
ORDER BY submitted_at DESC
LIMIT 10;`,
      },
    },
  },

  // ───────────── Data contracts
  {
    id: "keys", group: "contracts", title: "Primary and foreign keys",
    summary: "Declare what identifies a row and which rows it must point to, then watch the database enforce it.",
    scripts: {
      retail: broken({
        tryThis: "Create a wishlist with a two-column primary key and foreign keys to customers and products. Then try a customer that does not exist.",
        observe: "Two wishlist rows, each joined to a real product.",
        sql: `CREATE TABLE wishlist_items (
  customer_id INTEGER NOT NULL REFERENCES customers (customer_id),
  stock_code TEXT NOT NULL REFERENCES products (stock_code),
  added_at TEXT NOT NULL,
  PRIMARY KEY (customer_id, stock_code)
);
INSERT INTO wishlist_items VALUES (13093, '85123A', '2011-12-01');
INSERT INTO wishlist_items VALUES (13093, '22423', '2011-12-02');
SELECT w.customer_id, w.stock_code, p.description, w.added_at
FROM wishlist_items AS w
JOIN products AS p USING (stock_code);`,
      }, "Insert an unknown customer", "INSERT INTO wishlist_items VALUES (1, '85123A', '2011-12-03');",
      "FOREIGN KEY constraint failed: customer 1 does not exist, so the row is rejected."),
      energy: broken({
        tryThis: "Create a corrections table keyed by (ba_code, hour_ending_utc). Then try a second correction for the same hour.",
        observe: "Two corrections for different authorities in the same hour: allowed, because the key is the pair.",
        sql: `CREATE TABLE demand_corrections (
  ba_code TEXT NOT NULL REFERENCES balancing_authorities (ba_code),
  hour_ending_utc TEXT NOT NULL,
  corrected_mw INTEGER NOT NULL,
  PRIMARY KEY (ba_code, hour_ending_utc)
);
INSERT INTO demand_corrections VALUES ('ERCO', '2024-03-15 18:00', 52000);
INSERT INTO demand_corrections VALUES ('CISO', '2024-03-15 18:00', 31000);
SELECT *
FROM demand_corrections;`,
      }, "Correct the same hour twice", "INSERT INTO demand_corrections VALUES ('ERCO', '2024-03-15 18:00', 52500);",
      "UNIQUE constraint failed: (ERCO, 2024-03-15 18:00) already exists. A composite primary key is unique as a combination."),
      developer: broken({
        tryThis: "Add a sub-team under an existing top-level team (teams reference their parent team). Then try a parent that does not exist.",
        observe: "The new team is joined to its parent: a self-referencing foreign key.",
        sql: `INSERT INTO teams (organization_id, team_name, parent_team_id)
SELECT organization_id, 'Platform Reliability', team_id
FROM teams
WHERE parent_team_id IS NULL
ORDER BY team_id
LIMIT 1;
SELECT child.team_id, child.team_name, parent.team_name AS parent_team
FROM teams AS child
JOIN teams AS parent ON parent.team_id = child.parent_team_id
WHERE child.team_name = 'Platform Reliability';`,
      }, "Use a missing parent team", "INSERT INTO teams (organization_id, team_name, parent_team_id) VALUES (1, 'Orphan team', 99999);",
      "FOREIGN KEY constraint failed: team 99999 does not exist, so the orphan is rejected."),
    },
  },
  {
    id: "not-null-check", group: "contracts", title: "NOT NULL and CHECK constraints",
    summary: "Write business rules into the table definition so invalid rows can never be stored.",
    scripts: {
      payments: broken({
        tryThis: "Create transfer_requests with a positive-amount CHECK and a rule that the two accounts differ. Then try a negative amount.",
        observe: "One valid transfer request is stored.",
        sql: `CREATE TABLE transfer_requests (
  request_id INTEGER PRIMARY KEY,
  from_account_id INTEGER NOT NULL REFERENCES accounts (account_id),
  to_account_id INTEGER NOT NULL REFERENCES accounts (account_id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  requested_at TEXT NOT NULL,
  CHECK (from_account_id <> to_account_id)
);
INSERT INTO transfer_requests (from_account_id, to_account_id, amount_cents, requested_at)
VALUES (1264, 1753, 25000, '2025-06-30 12:00:00');
SELECT *
FROM transfer_requests;`,
      }, "Request a negative amount", "INSERT INTO transfer_requests (from_account_id, to_account_id, amount_cents, requested_at) VALUES (1264, 1753, -500, '2025-06-30 12:05:00');",
      "CHECK constraint failed: amount_cents > 0. The rule lives in the table, so every writer obeys it."),
      healthcare: broken({
        tryThis: "Create a staging table for blood pressure with plausible ranges and diastolic below systolic. Then swap the two values.",
        observe: "One plausible reading is stored.",
        sql: `CREATE TABLE blood_pressure_readings (
  patient_id INTEGER NOT NULL REFERENCES patients (patient_id),
  observed_at TEXT NOT NULL,
  systolic INTEGER NOT NULL CHECK (systolic BETWEEN 50 AND 260),
  diastolic INTEGER NOT NULL CHECK (diastolic BETWEEN 30 AND 160),
  CHECK (diastolic < systolic)
);
INSERT INTO blood_pressure_readings VALUES (592, '2025-06-01 09:00:00', 128, 82);
SELECT *
FROM blood_pressure_readings;`,
      }, "Swap systolic and diastolic", "INSERT INTO blood_pressure_readings VALUES (592, '2025-06-02 09:00:00', 82, 128);",
      "CHECK constraint failed: diastolic < systolic. A swapped pair is caught at write time."),
      weather: broken({
        tryThis: "Copy one day of observations into a checked table (tmin ≤ tmax, precipitation ≥ 0). Then insert an impossible day.",
        observe: "Every real observation for 4 July 2024 passes the checks.",
        sql: `CREATE TABLE observations_checked (
  station_id TEXT NOT NULL REFERENCES stations (station_id),
  observation_date TEXT NOT NULL,
  tmax_c REAL,
  tmin_c REAL,
  precipitation_mm REAL CHECK (precipitation_mm >= 0),
  CHECK (tmin_c <= tmax_c),
  PRIMARY KEY (station_id, observation_date)
);
INSERT INTO observations_checked
SELECT station_id, observation_date, tmax_c, tmin_c, precipitation_mm
FROM daily_weather
WHERE observation_date = '2024-07-04';
SELECT COUNT(*) AS rows_loaded, MIN(tmin_c) AS coldest_low, MAX(tmax_c) AS hottest_high
FROM observations_checked;`,
      }, "Insert tmin above tmax", "INSERT INTO observations_checked VALUES ('USW00014819', '2024-07-05', 18.0, 29.0, 0);",
      "CHECK constraint failed: tmin_c <= tmax_c."),
    },
  },
  {
    id: "unique", group: "contracts", title: "Unique constraints",
    summary: "Guarantee that a business identifier appears once, and find out when the data already breaks that promise.",
    scripts: {
      retail: broken({
        tryThis: "Add a unique index on invoice_no (it succeeds: every invoice number is distinct). Then try to reuse an invoice number.",
        observe: "The counts match: one order header per invoice number, so the unique index could be built.",
        sql: `CREATE UNIQUE INDEX ux_orders_invoice_no ON orders (invoice_no);
SELECT COUNT(*) AS orders, COUNT(DISTINCT invoice_no) AS invoice_numbers
FROM orders;`,
      }, "Reuse an invoice number", "INSERT INTO orders (invoice_no, customer_id, ordered_at, country, order_type) VALUES ('489438', NULL, '2011-12-10 10:00:00', 'United Kingdom', 'sale');",
      "UNIQUE constraint failed: orders.invoice_no. The index now protects the identifier."),
      payments: {
        tryThis: "Network retries repeat request_key, so a unique index on authorizations would fail. Load one row per request into a table that is unique by request_key instead.",
        observe: "Fewer unique requests than authorization attempts: INSERT OR IGNORE skipped every retry the UNIQUE rule rejected.",
        sql: `CREATE TABLE authorization_requests (
  request_key TEXT NOT NULL UNIQUE,
  first_authorization_id INTEGER NOT NULL,
  card_id INTEGER NOT NULL
);
INSERT OR IGNORE INTO authorization_requests
SELECT request_key, authorization_id, card_id
FROM authorizations
ORDER BY authorization_id;
SELECT (SELECT COUNT(*) FROM authorizations) AS attempts,
       COUNT(*) AS unique_requests
FROM authorization_requests;`,
        variant: {
          label: "Make request_key unique in place",
          sql: `CREATE UNIQUE INDEX ux_authorizations_request_key ON authorizations (request_key);
SELECT COUNT(*) AS attempts
FROM authorizations;`,
          observe: "UNIQUE constraint failed: existing retries already share a request_key, so the index cannot be built until the data is deduplicated.",
        },
      },
    },
  },
  {
    id: "transactions", group: "contracts", title: "Transactions",
    summary: "Group several writes so they all happen or none do.",
    scripts: {
      payments: {
        tryThis: "Move money between two accounts as two ledger entries inside BEGIN … ROLLBACK. Then change ROLLBACK to COMMIT and run again.",
        observe: "0 rows after ROLLBACK: both entries were undone together. With COMMIT you get 2 rows.",
        sql: `BEGIN;
INSERT INTO transactions (account_id, transaction_type, status, amount_cents, initiated_at, posted_at, description)
VALUES (1264, 'transfer_out', 'posted', -25000, '2025-06-30 12:00:00', '2025-06-30 12:00:00', 'Lab transfer to 1753');
INSERT INTO transactions (account_id, transaction_type, status, amount_cents, initiated_at, posted_at, description)
VALUES (1753, 'transfer_in', 'posted', 25000, '2025-06-30 12:00:00', '2025-06-30 12:00:00', 'Lab transfer from 1264');
ROLLBACK;
SELECT COUNT(*) AS transfer_rows
FROM transactions
WHERE description LIKE 'Lab transfer%';`,
      },
      retail: {
        tryThis: "Delete every invoice line inside a transaction, check the count mid-way, then roll back.",
        observe: "All 125,613 lines are back after ROLLBACK, even though the DELETE succeeded inside the transaction.",
        sql: `BEGIN;
DELETE FROM returns;
DELETE FROM order_items;
ROLLBACK;
SELECT COUNT(*) AS invoice_lines
FROM order_items;`,
      },
    },
  },
  {
    id: "savepoints", group: "contracts", title: "Savepoints and rollback",
    summary: "Undo part of a transaction while keeping the rest.",
    scripts: {
      payments: {
        tryThis: "Post a fee, set a savepoint, post a refund, then roll back to the savepoint before committing.",
        observe: "Only the fee remains. ROLLBACK TO undid the work after the savepoint; COMMIT kept the work before it.",
        sql: `BEGIN;
INSERT INTO transactions (account_id, transaction_type, status, amount_cents, initiated_at, posted_at, description)
VALUES (1264, 'fee', 'posted', -1200, '2025-06-30 13:00:00', '2025-06-30 13:00:00', 'Lab monthly fee');
SAVEPOINT before_refund;
INSERT INTO transactions (account_id, transaction_type, status, amount_cents, initiated_at, posted_at, description)
VALUES (1264, 'refund', 'posted', 1200, '2025-06-30 13:05:00', '2025-06-30 13:05:00', 'Lab fee refund');
ROLLBACK TO before_refund;
RELEASE before_refund;
COMMIT;
SELECT transaction_type, amount_cents, description
FROM transactions
WHERE description LIKE 'Lab %';`,
      },
    },
  },
  {
    id: "audit-trigger", group: "contracts", title: "Audit trigger",
    summary: "Let the database record or refuse changes automatically, whoever makes them.",
    scripts: {
      payments: {
        tryThis: "Create an audit table and a trigger on accounts.closed_at, then close two accounts.",
        observe: "Two audit rows, each with the old (NULL) and new closing date. The UPDATE never mentioned the audit table.",
        sql: `CREATE TABLE account_audit (
  audit_id INTEGER PRIMARY KEY,
  account_id INTEGER NOT NULL,
  old_closed_at TEXT,
  new_closed_at TEXT,
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trg_accounts_closed AFTER UPDATE OF closed_at ON accounts
BEGIN
  INSERT INTO account_audit (account_id, old_closed_at, new_closed_at)
  VALUES (OLD.account_id, OLD.closed_at, NEW.closed_at);
END;
UPDATE accounts
SET closed_at = '2025-06-30'
WHERE account_id IN (1264, 1753);
SELECT account_id, old_closed_at, new_closed_at
FROM account_audit;`,
      },
      developer: {
        tryThis: "Record every deployment status change with a trigger, then mark a few failed production deploys as rolled back.",
        observe: "One audit row per changed deployment, showing failed → rolled_back.",
        sql: `CREATE TABLE deployment_status_log (
  deployment_id INTEGER NOT NULL,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER trg_deployment_status AFTER UPDATE OF status ON deployments
WHEN OLD.status <> NEW.status
BEGIN
  INSERT INTO deployment_status_log (deployment_id, old_status, new_status)
  VALUES (OLD.deployment_id, OLD.status, NEW.status);
END;
UPDATE deployments
SET status = 'rolled_back'
WHERE deployment_id IN (
  SELECT deployment_id FROM deployments
  WHERE environment = 'production' AND status = 'failed'
  ORDER BY started_at DESC
  LIMIT 3
);
SELECT deployment_id, old_status, new_status
FROM deployment_status_log;`,
      },
      logistics: broken({
        tryThis: "Make tracking_events append-only with a BEFORE UPDATE trigger. Appending a scan still works; then try editing one.",
        observe: "The new scan was appended; the trigger exists in the schema.",
        sql: `CREATE TRIGGER trg_tracking_events_append_only BEFORE UPDATE ON tracking_events
BEGIN
  SELECT RAISE(ABORT, 'tracking_events is append-only: insert a correcting event instead');
END;
INSERT INTO tracking_events (package_id, event_type, event_at, recorded_at, warehouse_id, event_source)
VALUES (5419, 'exception', '2025-04-28 12:00:00', '2025-04-28 12:01:00', NULL, 'lab');
SELECT event_id, package_id, event_type, event_source
FROM tracking_events
WHERE event_source = 'lab';`,
      }, "Edit an existing scan", "UPDATE tracking_events SET event_type = 'delivered' WHERE event_id = 1;",
      "The trigger aborted the UPDATE with its own message: history cannot be rewritten in place."),
    },
  },

  // ───────────── Data engineering
  {
    id: "stage-raw", group: "engineering", title: "Stage raw data",
    summary: "Land incoming data as-is in a staging table before any cleaning, so a load can always be traced back to its input.",
    scripts: {
      retail: {
        tryThis: "Stage December 2011 invoice lines as untyped text, the way a file export would arrive.",
        observe: "Staged line and invoice counts, and quantity stored as text: nothing has been interpreted yet.",
        sql: `CREATE TABLE stg_invoice_lines (
  invoice_no TEXT,
  stock_code TEXT,
  quantity TEXT,
  unit_price TEXT,
  invoiced_at TEXT,
  loaded_at TEXT DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO stg_invoice_lines (invoice_no, stock_code, quantity, unit_price, invoiced_at)
SELECT o.invoice_no, oi.stock_code, CAST(oi.quantity AS TEXT), CAST(oi.unit_price AS TEXT), o.ordered_at
FROM order_items AS oi
JOIN orders AS o USING (order_id)
WHERE o.ordered_at >= '2011-12-01';
SELECT COUNT(*) AS staged_lines,
       COUNT(DISTINCT invoice_no) AS invoices,
       typeof(MIN(quantity)) AS quantity_stored_as
FROM stg_invoice_lines;`,
      },
      energy: {
        tryThis: "Stage one day of hourly demand in the shape of a raw EIA-930 feed: ISO timestamps with a Z and numbers as text.",
        observe: "24 staged hours per balancing authority, still in the feed's own format.",
        sql: `CREATE TABLE stg_eia930_demand (
  ba TEXT,
  period TEXT,
  demand TEXT,
  forecast TEXT
);
INSERT INTO stg_eia930_demand
SELECT ba_code, replace(hour_ending_utc, ' ', 'T') || ':00Z', CAST(demand_mw AS TEXT), CAST(forecast_mw AS TEXT)
FROM hourly_demand
WHERE hour_ending_utc >= '2024-06-15' AND hour_ending_utc < '2024-06-16';
SELECT ba, COUNT(*) AS hours, MIN(period) AS first_period, MAX(period) AS last_period
FROM stg_eia930_demand
GROUP BY ba;`,
      },
      logistics: {
        tryThis: "Stage the last day of scans exactly as received, with a batch id for traceability.",
        observe: "Staged scans grouped by event type, all tagged with the same batch id.",
        sql: `CREATE TABLE stg_scans (
  batch_id TEXT NOT NULL,
  tracking_number TEXT,
  event_type TEXT,
  event_at TEXT,
  facility_code TEXT
);
INSERT INTO stg_scans
SELECT 'batch-2025-04-28', p.tracking_number, e.event_type, e.event_at, w.warehouse_code
FROM tracking_events AS e
JOIN packages AS p USING (package_id)
LEFT JOIN warehouses AS w USING (warehouse_id)
WHERE e.recorded_at >= '2025-04-28';
SELECT batch_id, event_type, COUNT(*) AS scans
FROM stg_scans
GROUP BY batch_id, event_type
ORDER BY scans DESC;`,
      },
    },
  },
  {
    id: "clean-cast", group: "engineering", title: "Clean and cast records",
    summary: "Turn raw text into typed, consistent columns with CAST, NULLIF, COALESCE and CASE.",
    scripts: {
      mobility: {
        tryThis: "Stage the last day of trips as text, then cast them into a clean table: zero passengers become NULL and the Y/N flag becomes 1/0.",
        observe: "Each clean column now has one storage type; unknown passenger counts are NULL rather than 0.",
        sql: `CREATE TABLE stg_trips AS
SELECT trip_id,
       CAST(passenger_count AS TEXT) AS passenger_count,
       printf('%.2f', fare_amount) AS fare,
       store_and_fwd_flag
FROM trips
WHERE pickup_at >= '2025-03-31';
CREATE TABLE clean_trips AS
SELECT trip_id,
       NULLIF(CAST(passenger_count AS INTEGER), 0) AS passengers,
       CAST(fare AS REAL) AS fare_amount,
       CASE store_and_fwd_flag WHEN 'Y' THEN 1 WHEN 'N' THEN 0 END AS stored_offline
FROM stg_trips;
SELECT typeof(passengers) AS passengers_type,
       typeof(fare_amount) AS fare_type,
       typeof(stored_offline) AS flag_type,
       COUNT(*) AS trips
FROM clean_trips
GROUP BY 1, 2, 3
ORDER BY trips DESC;`,
      },
      flights: {
        tryThis: "Stage delay columns as text, then cast them: missing delay causes become 0 minutes and a flight is delayed at 15+ minutes late.",
        observe: "Delayed and on-time flights with their carrier and weather delay minutes. Cancelled flights have no arrival, so is_delayed stays NULL.",
        sql: `CREATE TABLE stg_delays AS
SELECT flight_id,
       CAST(carrier_delay AS TEXT) AS carrier_delay,
       CAST(weather_delay AS TEXT) AS weather_delay,
       CAST(arrival_delay AS TEXT) AS arrival_delay
FROM flights
WHERE flight_date = '2025-03-31';
CREATE TABLE clean_delays AS
SELECT flight_id,
       COALESCE(CAST(carrier_delay AS INTEGER), 0) AS carrier_delay_min,
       COALESCE(CAST(weather_delay AS INTEGER), 0) AS weather_delay_min,
       CAST(arrival_delay AS INTEGER) >= 15 AS is_delayed
FROM stg_delays;
SELECT is_delayed,
       COUNT(*) AS flights,
       SUM(carrier_delay_min) AS carrier_minutes,
       SUM(weather_delay_min) AS weather_minutes
FROM clean_delays
GROUP BY is_delayed;`,
      },
    },
  },
  {
    id: "dedupe", group: "engineering", title: "Deduplicate incoming rows",
    summary: "Keep exactly one copy of each logical record when the source delivers some of them more than once.",
    scripts: {
      saas: {
        tryThis: "Keep the first delivery of each event_id (retries repeat it) using ROW_NUMBER().",
        observe: "135,428 deliveries become 132,127 logical events: 3,301 retried deliveries removed.",
        sql: `CREATE TABLE events_clean AS
SELECT delivery_id, event_id, user_id, account_id, event_name, occurred_at
FROM (
  SELECT e.*,
         ROW_NUMBER() OVER (PARTITION BY event_id ORDER BY received_at, delivery_id) AS copy_number
  FROM events AS e
)
WHERE copy_number = 1;
SELECT (SELECT COUNT(*) FROM events) AS deliveries,
       COUNT(*) AS logical_events,
       (SELECT COUNT(*) FROM events) - COUNT(*) AS duplicates_removed
FROM events_clean;`,
      },
      iot: {
        tryThis: "Retransmissions repeat (device_id, recorded_at, sequence_number) with a new reading_id. Keep the first copy of each.",
        observe: "1,293 retransmitted readings removed; each physical reading appears once.",
        sql: `CREATE TABLE readings_clean AS
SELECT MIN(reading_id) AS reading_id, device_id, sequence_number, recorded_at, value
FROM sensor_readings
GROUP BY device_id, recorded_at, sequence_number;
SELECT (SELECT COUNT(*) FROM sensor_readings) AS received,
       COUNT(*) AS unique_readings,
       (SELECT COUNT(*) FROM sensor_readings) - COUNT(*) AS retransmissions_removed
FROM readings_clean;`,
      },
    },
  },
  {
    id: "upsert", group: "engineering", title: "UPSERT new and changed rows",
    summary: "Insert rows that are new and update rows that already exist, in one statement keyed on a unique column.",
    scripts: {
      retail: {
        tryThis: "Apply a price feed with two existing products and one new product using INSERT … ON CONFLICT DO UPDATE.",
        observe: "85123A and 22423 have the feed's new prices; NEW-001 was inserted. Run it twice: the result is the same.",
        sql: `CREATE TEMP TABLE price_feed (
  stock_code TEXT PRIMARY KEY,
  list_price REAL NOT NULL
);
INSERT INTO price_feed VALUES ('85123A', 2.75), ('22423', 11.95), ('NEW-001', 4.50);
INSERT INTO products (stock_code, description, category_id, list_price, first_sold_at, is_merchandise)
SELECT stock_code, 'New product', NULL, list_price, '2011-12-10', 1
FROM price_feed
WHERE true
ON CONFLICT (stock_code) DO UPDATE SET list_price = excluded.list_price;
SELECT stock_code, description, list_price
FROM products
WHERE stock_code IN (SELECT stock_code FROM price_feed)
ORDER BY stock_code;`,
      },
      weather: {
        tryThis: "Load a late correction for Chicago on 4 July 2024 and a day a New York station never reported, keyed on (station_id, observation_date).",
        observe: "The Chicago day is corrected in place; the missing New York day is inserted. Two rows, no duplicates.",
        sql: `INSERT INTO daily_weather (station_id, observation_date, tmax_c, tmin_c, precipitation_mm, precip_trace)
VALUES ('USW00014819', '2024-07-04', 31.1, 20.0, 12.4, 0),
       ('USW00094732', '2024-12-01', 6.1, -0.6, 0.0, 0)
ON CONFLICT (station_id, observation_date) DO UPDATE
SET tmax_c = excluded.tmax_c,
    tmin_c = excluded.tmin_c,
    precipitation_mm = excluded.precipitation_mm;
SELECT station_id, observation_date, tmax_c, tmin_c, precipitation_mm
FROM daily_weather
WHERE (station_id = 'USW00014819' AND observation_date = '2024-07-04')
   OR (station_id = 'USW00094732' AND observation_date = '2024-12-01');`,
      },
      logistics: {
        tryThis: "Stage a carrier feed that raises two on-time targets and adds a carrier, then apply it keyed on carrier_id.",
        observe: "Carriers 1 and 2 keep their names with new targets; carrier 99 is new. Applying the feed again changes nothing.",
        sql: `CREATE TEMP TABLE carrier_feed AS
SELECT carrier_id, carrier_name, carrier_type, on_time_target_pct + 2 AS on_time_target_pct
FROM carriers
WHERE carrier_id IN (1, 2);
INSERT INTO carrier_feed VALUES (99, 'Ridgeway Linehaul', 'regional', 93);
INSERT INTO carriers (carrier_id, carrier_name, carrier_type, on_time_target_pct)
SELECT carrier_id, carrier_name, carrier_type, on_time_target_pct
FROM carrier_feed
WHERE true
ON CONFLICT (carrier_id) DO UPDATE SET on_time_target_pct = excluded.on_time_target_pct;
SELECT carrier_id, carrier_name, carrier_type, on_time_target_pct
FROM carriers
WHERE carrier_id IN (1, 2, 99)
ORDER BY carrier_id;`,
      },
    },
  },
  {
    id: "reject-invalid", group: "engineering", title: "Reject invalid rows",
    summary: "Route rows that break the rules into a rejects table with a reason, and load only the rest.",
    scripts: {
      mobility: {
        tryThis: "Send trips with a negative total, zero distance or a drop-off not after pickup to trip_rejects with a reason; load the rest.",
        observe: "Rejected trips grouped by reason, plus the accepted count. Rejected + accepted = every source trip.",
        sql: `CREATE TABLE trip_rejects (
  trip_id INTEGER PRIMARY KEY,
  reason TEXT NOT NULL
);
INSERT INTO trip_rejects
SELECT trip_id,
       CASE
         WHEN total_amount < 0 THEN 'negative total'
         WHEN dropoff_at <= pickup_at THEN 'drop-off not after pickup'
         ELSE 'zero distance'
       END
FROM trips
WHERE total_amount < 0 OR trip_distance_miles = 0 OR dropoff_at <= pickup_at;
CREATE TABLE trips_accepted AS
SELECT * FROM trips
WHERE trip_id NOT IN (SELECT trip_id FROM trip_rejects);
SELECT reason, COUNT(*) AS trips FROM trip_rejects GROUP BY reason
UNION ALL
SELECT 'accepted', COUNT(*) FROM trips_accepted;`,
      },
      iot: {
        tryThis: "Reject readings outside their sensor type's physically valid range, keeping the reason and the limit they broke.",
        observe: "Rejected readings per sensor type; everything else is accepted.",
        sql: `CREATE TABLE reading_rejects AS
SELECT r.reading_id, t.type_name, r.value, t.valid_min, t.valid_max
FROM sensor_readings AS r
JOIN devices AS d USING (device_id)
JOIN sensor_types AS t USING (sensor_type_id)
WHERE r.value < t.valid_min OR r.value > t.valid_max;
SELECT type_name, COUNT(*) AS rejected, MIN(value) AS lowest, MAX(value) AS highest
FROM reading_rejects
GROUP BY type_name
ORDER BY rejected DESC;`,
      },
    },
  },
  {
    id: "idempotent-replay", group: "engineering", title: "Replay an idempotent load",
    summary: "Write a load that can run twice without double-counting, then prove it by running it twice.",
    scripts: {
      saas: broken({
        tryThis: "Load June's events keyed by event_id with ON CONFLICT DO NOTHING, then replay the exact same load.",
        observe: "The count after the replay equals the count after the first load: replaying changed nothing.",
        sql: `CREATE TABLE fact_events (
  event_id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  event_name TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);
INSERT INTO fact_events
SELECT event_id, account_id, event_name, MIN(occurred_at)
FROM events WHERE occurred_at >= '2025-06-01'
GROUP BY event_id
ON CONFLICT (event_id) DO NOTHING;
INSERT INTO fact_events
SELECT event_id, account_id, event_name, MIN(occurred_at)
FROM events WHERE occurred_at >= '2025-06-01'
GROUP BY event_id
ON CONFLICT (event_id) DO NOTHING;
SELECT COUNT(*) AS loaded_events
FROM fact_events;`,
      }, "Replay without ON CONFLICT", "INSERT INTO fact_events SELECT event_id, account_id, event_name, MIN(occurred_at) FROM events WHERE occurred_at >= '2025-06-01' GROUP BY event_id;",
      "UNIQUE constraint failed: fact_events.event_id. A plain INSERT is not safe to replay."),
      logistics: {
        tryThis: "Load delivered packages with a NOT EXISTS guard, then run the same load again.",
        observe: "The second run inserted nothing: the guard makes the load safe to repeat.",
        sql: `CREATE TABLE delivered_packages (
  package_id INTEGER PRIMARY KEY,
  delivered_at TEXT NOT NULL
);
INSERT INTO delivered_packages
SELECT package_id, MIN(event_at)
FROM tracking_events AS e
WHERE event_type = 'delivered'
  AND NOT EXISTS (SELECT 1 FROM delivered_packages AS d WHERE d.package_id = e.package_id)
GROUP BY package_id;
INSERT INTO delivered_packages
SELECT package_id, MIN(event_at)
FROM tracking_events AS e
WHERE event_type = 'delivered'
  AND NOT EXISTS (SELECT 1 FROM delivered_packages AS d WHERE d.package_id = e.package_id)
GROUP BY package_id;
SELECT COUNT(*) AS delivered_packages, changes() AS rows_added_by_replay
FROM delivered_packages;`,
      },
    },
  },
  {
    id: "atomic-refresh", group: "engineering", title: "Atomic table refresh",
    summary: "Rebuild a derived table and swap it in inside one transaction, so readers never see it half-built.",
    scripts: {
      retail: {
        tryThis: "Build daily_sales up to November, then rebuild it with all data in a new table and swap the two inside BEGIN … COMMIT.",
        observe: "daily_sales now runs to December 2011. Had anything failed before COMMIT, the old table would still be in place.",
        sql: `CREATE TABLE daily_sales AS
SELECT date(o.ordered_at) AS day, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS net_sales
FROM orders AS o JOIN order_items AS oi USING (order_id)
WHERE o.ordered_at < '2011-12-01'
GROUP BY day;
BEGIN;
CREATE TABLE daily_sales_new AS
SELECT date(o.ordered_at) AS day, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS net_sales
FROM orders AS o JOIN order_items AS oi USING (order_id)
GROUP BY day;
DROP TABLE daily_sales;
ALTER TABLE daily_sales_new RENAME TO daily_sales;
COMMIT;
SELECT COUNT(*) AS days, MIN(day) AS first_day, MAX(day) AS latest_day
FROM daily_sales;`,
      },
      energy: {
        tryThis: "Swap in a freshly computed daily_peaks table in one transaction.",
        observe: "One row per authority and day after the swap, covering January to June 2024.",
        sql: `CREATE TABLE daily_peaks AS
SELECT ba_code, local_date, MAX(demand_mw) AS peak_mw
FROM hourly_demand
WHERE local_date < '2024-06-01'
GROUP BY ba_code, local_date;
BEGIN;
CREATE TABLE daily_peaks_new AS
SELECT ba_code, local_date, MAX(demand_mw) AS peak_mw
FROM hourly_demand
GROUP BY ba_code, local_date;
DROP TABLE daily_peaks;
ALTER TABLE daily_peaks_new RENAME TO daily_peaks;
COMMIT;
SELECT COUNT(*) AS rows, MIN(local_date) AS first_day, MAX(local_date) AS last_day
FROM daily_peaks;`,
      },
    },
  },

  // ───────────── Warehouse
  {
    id: "build-dimension", group: "warehouse", title: "Build a dimension",
    summary: "Create a descriptive table with one row per business entity, ready to join facts to.",
    scripts: {
      retail: {
        tryThis: "Build dim_customer from customers and each customer's current segment in customer_history.",
        observe: "One row per customer with its current segment; customers are grouped by segment.",
        sql: `CREATE TABLE dim_customer (
  customer_key INTEGER PRIMARY KEY,
  customer_id INTEGER NOT NULL UNIQUE,
  country TEXT NOT NULL,
  region TEXT NOT NULL,
  segment TEXT,
  first_order_date TEXT NOT NULL
);
INSERT INTO dim_customer (customer_id, country, region, segment, first_order_date)
SELECT c.customer_id, c.country, c.region, h.segment, date(c.first_order_at)
FROM customers AS c
LEFT JOIN customer_history AS h ON h.customer_id = c.customer_id AND h.is_current = 1
ORDER BY c.customer_id;
SELECT segment, COUNT(*) AS customers
FROM dim_customer
GROUP BY segment
ORDER BY customers DESC;`,
      },
      sports: {
        tryThis: "Build dim_team with readable league and division labels for every club code.",
        observe: "Clubs per league and division, with the Athletics' two codes (OAK and ATH) as separate rows.",
        sql: `CREATE TABLE dim_team (
  team_key INTEGER PRIMARY KEY,
  team_id TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  league_name TEXT NOT NULL,
  division TEXT NOT NULL
);
INSERT INTO dim_team (team_id, team_name, league_name, division)
SELECT team_id, city || ' ' || nickname,
       CASE league WHEN 'AL' THEN 'American League' ELSE 'National League' END,
       division
FROM teams
ORDER BY team_id;
SELECT league_name, division, COUNT(*) AS clubs, group_concat(team_id, ', ') AS codes
FROM dim_team
GROUP BY league_name, division;`,
      },
    },
  },
  {
    id: "build-fact", group: "warehouse", title: "Build a fact table",
    summary: "Create a table of measurable events at a declared grain, with keys to its dimensions.",
    scripts: {
      retail: {
        tryThis: "Build fact_sales at the grain of one sale invoice line, with a date key, then total sales by month.",
        observe: "Monthly sales lines and totals from the fact table, newest month first.",
        sql: `CREATE TABLE fact_sales AS
SELECT oi.order_item_id,
       date(o.ordered_at) AS date_key,
       o.customer_id,
       oi.stock_code,
       oi.quantity,
       ROUND(oi.quantity * oi.unit_price, 2) AS line_amount
FROM order_items AS oi
JOIN orders AS o USING (order_id)
WHERE o.order_type = 'sale';
SELECT strftime('%Y-%m', date_key) AS month, COUNT(*) AS lines, ROUND(SUM(line_amount), 2) AS sales
FROM fact_sales
GROUP BY month
ORDER BY month DESC
LIMIT 12;`,
      },
      flights: {
        tryThis: "Build fact_route_day at the grain of one airline, route and date, then find the most cancelled routes.",
        observe: "Route-days are summed back up per route; the fact table is much smaller than flights but answers the same question.",
        sql: `CREATE TABLE fact_route_day AS
SELECT flight_date, airline_code, route_id,
       COUNT(*) AS flights,
       SUM(cancelled) AS cancelled,
       SUM(arrival_delay >= 15) AS delayed
FROM flights
GROUP BY flight_date, airline_code, route_id;
SELECT r.origin, r.destination, SUM(f.flights) AS flights, SUM(f.cancelled) AS cancelled,
       (SELECT COUNT(*) FROM fact_route_day) AS fact_rows
FROM fact_route_day AS f
JOIN routes AS r USING (route_id)
GROUP BY r.route_id
ORDER BY cancelled DESC
LIMIT 10;`,
      },
    },
  },
  {
    id: "surrogate-keys", group: "warehouse", title: "Generate surrogate keys",
    summary: "Give each dimension row a meaningless integer key, including a reserved row for unknown values.",
    scripts: {
      retail: {
        tryThis: "Build dim_product with product_key 0 reserved for unknown products, then let SQLite number the rest.",
        observe: "Key 0 is the unknown member; real products start at 1 in stock-code order.",
        sql: `CREATE TABLE dim_product (
  product_key INTEGER PRIMARY KEY,
  stock_code TEXT NOT NULL UNIQUE,
  description TEXT,
  category_name TEXT NOT NULL
);
INSERT INTO dim_product VALUES (0, 'UNKNOWN', 'Unknown product', 'Unknown');
INSERT INTO dim_product (stock_code, description, category_name)
SELECT p.stock_code, p.description, COALESCE(c.category_name, 'Uncategorised')
FROM products AS p
LEFT JOIN categories AS c USING (category_id)
ORDER BY p.stock_code;
SELECT product_key, stock_code, description, category_name
FROM dim_product
ORDER BY product_key
LIMIT 10;`,
      },
    },
  },
  {
    id: "scd2", group: "warehouse", title: "SCD Type 2",
    summary: "Keep history when an attribute changes: close the current version and add a new one.",
    scripts: {
      retail: {
        tryThis: "Customer 13093 becomes a key account on 2012-03-01. Close their current customer_history row and add the new version.",
        observe: "The 'regular' row now ends on 2012-03-01 and a new current 'key_account' row starts there. Earlier versions are untouched.",
        sql: `UPDATE customer_history
SET valid_to = '2012-03-01', is_current = 0
WHERE customer_id = 13093 AND is_current = 1;
INSERT INTO customer_history (customer_id, segment, country, valid_from, valid_to, is_current)
SELECT customer_id, 'key_account', country, '2012-03-01', NULL, 1
FROM customer_history
WHERE customer_id = 13093 AND valid_to = '2012-03-01';
SELECT history_id, segment, country, valid_from, valid_to, is_current
FROM customer_history
WHERE customer_id = 13093
ORDER BY valid_from;`,
      },
    },
  },
  {
    id: "reconcile", group: "warehouse", title: "Reconcile source and target",
    summary: "Compare two systems that should agree and classify every difference.",
    scripts: {
      retail: {
        tryThis: "Compare each sale invoice's line total with its captured payments and store the outcome per invoice.",
        observe: "Invoices that match, differ, or have no captured payment. Payments are modelled, so some differences are expected.",
        sql: `CREATE TABLE recon_invoice_payments AS
WITH invoiced AS (
  SELECT o.order_id, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS invoiced
  FROM orders AS o JOIN order_items AS oi USING (order_id)
  WHERE o.order_type = 'sale'
  GROUP BY o.order_id
), paid AS (
  SELECT order_id, ROUND(SUM(amount), 2) AS paid
  FROM payments
  WHERE status = 'captured'
  GROUP BY order_id
)
SELECT i.order_id, i.invoiced, p.paid,
       CASE
         WHEN p.order_id IS NULL THEN 'no captured payment'
         WHEN abs(i.invoiced - p.paid) < 0.01 THEN 'matched'
         ELSE 'amount differs'
       END AS outcome
FROM invoiced AS i
LEFT JOIN paid AS p USING (order_id);
SELECT outcome, COUNT(*) AS invoices, ROUND(SUM(invoiced), 2) AS invoiced
FROM recon_invoice_payments
GROUP BY outcome
ORDER BY invoices DESC;`,
      },
      payments: {
        tryThis: "Check that every settled card purchase has a posted ledger entry for the same authorization, and classify the rest.",
        observe: "Settlements with and without a matching posted card purchase in transactions.",
        sql: `CREATE TABLE recon_settlements AS
SELECT s.settlement_id, s.authorization_id, s.amount_cents,
       CASE
         WHEN t.transaction_id IS NULL THEN 'no ledger entry'
         WHEN -t.amount_cents = s.amount_cents THEN 'matched'
         ELSE 'amount differs'
       END AS outcome
FROM settlements AS s
LEFT JOIN transactions AS t
  ON t.authorization_id = s.authorization_id
 AND t.transaction_type = 'card_purchase'
 AND t.status = 'posted';
SELECT outcome, COUNT(*) AS settlements
FROM recon_settlements
GROUP BY outcome
ORDER BY settlements DESC;`,
      },
    },
  },
  {
    id: "quality-gates", group: "warehouse", title: "Quality gates",
    summary: "Run named checks that must all pass before data is published, and record the result of each.",
    scripts: {
      retail: {
        tryThis: "Run four checks on the sales data and record failing-row counts. A gate passes only at zero.",
        observe: "Each check with its failing rows and pass/fail. Uncategorised products fail the gate: a real gap in the source.",
        sql: `CREATE TABLE quality_results (check_name TEXT NOT NULL, failing_rows INTEGER NOT NULL);
INSERT INTO quality_results
SELECT 'invoice lines without an order', COUNT(*)
FROM order_items AS oi LEFT JOIN orders AS o USING (order_id) WHERE o.order_id IS NULL
UNION ALL
SELECT 'sale lines with negative quantity', COUNT(*)
FROM order_items AS oi JOIN orders AS o USING (order_id) WHERE o.order_type = 'sale' AND oi.quantity < 0
UNION ALL
SELECT 'products without a category', COUNT(*) FROM products WHERE category_id IS NULL
UNION ALL
SELECT 'duplicate invoice numbers', COUNT(*) - COUNT(DISTINCT invoice_no) FROM orders;
SELECT check_name, failing_rows, CASE WHEN failing_rows = 0 THEN 'pass' ELSE 'fail' END AS gate
FROM quality_results;`,
      },
      energy: {
        tryThis: "Check hourly demand for missing values, imputed hours, negative demand and missing hours per authority.",
        observe: "Each gate's failing rows. Imputed hours are flagged by the source, so that gate fails on purpose.",
        sql: `CREATE TABLE quality_results (check_name TEXT NOT NULL, failing_rows INTEGER NOT NULL);
INSERT INTO quality_results
SELECT 'demand is NULL', COUNT(*) FROM hourly_demand WHERE demand_mw IS NULL
UNION ALL
SELECT 'demand was imputed', COUNT(*) FROM hourly_demand WHERE demand_imputed = 1
UNION ALL
SELECT 'negative demand', COUNT(*) FROM hourly_demand WHERE demand_mw < 0
UNION ALL
SELECT 'authorities missing hours', COUNT(*) FROM (
  SELECT ba_code FROM hourly_demand GROUP BY ba_code
  HAVING COUNT(*) < (SELECT MAX(n) FROM (SELECT COUNT(*) AS n FROM hourly_demand GROUP BY ba_code))
);
SELECT check_name, failing_rows, CASE WHEN failing_rows = 0 THEN 'pass' ELSE 'fail' END AS gate
FROM quality_results;`,
      },
      weather: {
        tryThis: "Check observations for impossible temperatures, negative precipitation and stations with missing days.",
        observe: "Value checks pass; the coverage check fails because some stations did not report every day.",
        sql: `CREATE TABLE quality_results (check_name TEXT NOT NULL, failing_rows INTEGER NOT NULL);
INSERT INTO quality_results
SELECT 'tmin above tmax', COUNT(*) FROM daily_weather WHERE tmin_c > tmax_c
UNION ALL
SELECT 'negative precipitation', COUNT(*) FROM daily_weather WHERE precipitation_mm < 0
UNION ALL
SELECT 'stations missing days', COUNT(*) FROM (
  SELECT station_id FROM daily_weather GROUP BY station_id
  HAVING COUNT(*) < (SELECT COUNT(*) FROM calendar)
);
SELECT check_name, failing_rows, CASE WHEN failing_rows = 0 THEN 'pass' ELSE 'fail' END AS gate
FROM quality_results;`,
      },
    },
  },

  // ───────────── Your own script
  {
    id: "scratch", group: "free", title: "Write your own script",
    summary: "A blank disposable database: run any mix of CREATE, INSERT, UPDATE, DELETE and SELECT.",
    scripts: Object.fromEntries(TOOL_DATASETS.map((id) => [id, {
      tryThis: `Write any script against ${datasetName(id)}. End it with a SELECT to see what changed.`,
      observe: "Whatever your final SELECT returns. Nothing is graded and nothing is kept after the run.",
      sql: `CREATE TABLE scratch AS\nSELECT *\nFROM ${CENTRAL_TABLE[id]}\nLIMIT 100;\nSELECT COUNT(*) AS copied_rows\nFROM scratch;`,
    }])),
  },
];

export const experimentsFor = (id: CanonicalDatasetId) => labExperiments.filter((e) => e.scripts[id]);
