import type { CanonicalDatasetId } from "@/data/datasets/learning-map";

/** One way of writing the query. `setup` runs first on the same disposable copy (usually CREATE INDEX). */
export type Approach = { label: string; query: string; setup?: string };

/**
 * Two approaches that return the same rows on a canonical dataset, compared by their real
 * EXPLAIN QUERY PLAN output. Explanations describe the plans SQLite actually produces for this data.
 */
export type PerformanceComparison = {
  id: string;
  datasetId: CanonicalDatasetId;
  title: string;
  question: string;
  explain: string;
  takeaway: string;
  a: Approach;
  b: Approach;
};

const c = (x: PerformanceComparison) => x;

export const performanceComparisons: PerformanceComparison[] = [
  // Retail
  c({
    id: "retail-month-range", datasetId: "retail", title: "Function filter vs date range",
    question: "Both queries list November 2010 invoices. Why can only one of them jump straight to November?",
    explain: "orders has an index on ordered_at. Query A wraps the column in strftime(), so SQLite cannot compare the index entries to '2010-11' and walks the whole index, computing strftime() for every one of the 6,722 orders. Query B compares the raw column to a half-open range, so SQLite seeks to the first November entry and stops at December.",
    takeaway: "Keep the indexed column bare in WHERE. Express the condition on the column (a range) rather than on a function of the column.",
    a: { label: "strftime() on the column", query: "SELECT order_id, invoice_no, ordered_at FROM orders WHERE strftime('%Y-%m', ordered_at) = '2010-11' ORDER BY ordered_at, order_id" },
    b: { label: "half-open date range", query: "SELECT order_id, invoice_no, ordered_at FROM orders WHERE ordered_at >= '2010-11-01' AND ordered_at < '2010-12-01' ORDER BY ordered_at, order_id" },
  }),
  c({
    id: "retail-customer-time", datasetId: "retail", title: "Composite (customer_id, ordered_at)",
    question: "One customer's invoices since January 2011, oldest first. What does adding ordered_at to the customer index change?",
    explain: "With only idx_orders_customer_id, SQLite finds the customer's rows quickly but must filter the dates row by row and then sort them in a temporary B-tree. The composite index stores each customer's orders already sorted by time, so SQLite seeks to (customer, 2011-01-01) and reads forward: no date filtering afterwards and no sort.",
    takeaway: "Put the equality column first and the range or ORDER BY column second. One composite index can serve the filter and the ordering together.",
    a: { label: "customer index only", query: "SELECT order_id, ordered_at, order_type FROM orders WHERE customer_id = 13093 AND ordered_at >= '2011-01-01' ORDER BY ordered_at" },
    b: { label: "composite index", setup: "CREATE INDEX idx_orders_customer_time ON orders(customer_id, ordered_at)", query: "SELECT order_id, ordered_at, order_type FROM orders WHERE customer_id = 13093 AND ordered_at >= '2011-01-01' ORDER BY ordered_at" },
  }),
  c({
    id: "retail-covering-totals", datasetId: "retail", title: "Covering index for order totals",
    question: "Totals for 100 invoices from 125,613 invoice lines. Why does B never read the order_items table itself?",
    explain: "Both plans SEARCH by order_id. In A, each index entry points back to a table row, so SQLite fetches every matching line to read quantity and unit_price. B's index already contains order_id, quantity and unit_price, so the index alone answers the query: COVERING INDEX means the table is never touched.",
    takeaway: "A covering index trades extra storage and slower writes for reads that skip the table. Worth it for hot, narrow queries; not for every query.",
    a: { label: "index on order_id", query: "SELECT order_id, ROUND(SUM(quantity * unit_price), 2) AS order_value FROM order_items WHERE order_id BETWEEN 3000 AND 3099 GROUP BY order_id" },
    b: { label: "covering index", setup: "CREATE INDEX idx_order_items_value ON order_items(order_id, quantity, unit_price)", query: "SELECT order_id, ROUND(SUM(quantity * unit_price), 2) AS order_value FROM order_items WHERE order_id BETWEEN 3000 AND 3099 GROUP BY order_id" },
  }),

  // U.S. Flights
  c({
    id: "flights-month-range", datasetId: "flights", title: "Function filter vs date range",
    question: "Both queries count February 2025 flights and their average arrival delay. Why does one read all 124,460 flights?",
    explain: "flights has an index on flight_date. strftime('%m', flight_date) hides the column from that index, so A scans the full table and evaluates the function per row. B states the same month as a range on the bare column, so SQLite searches the index for February only.",
    takeaway: "Rewrite month and year filters as ranges: >= the first day and < the first day of the next period.",
    a: { label: "strftime() on the column", query: "SELECT COUNT(*) AS flights, ROUND(AVG(arrival_delay), 1) AS avg_arrival_delay FROM flights WHERE strftime('%m', flight_date) = '02'" },
    b: { label: "half-open date range", query: "SELECT COUNT(*) AS flights, ROUND(AVG(arrival_delay), 1) AS avg_arrival_delay FROM flights WHERE flight_date >= '2025-02-01' AND flight_date < '2025-03-01'" },
  }),
  c({
    id: "flights-origin-date", datasetId: "flights", title: "Composite (origin, flight_date)",
    question: "Daily departures from Denver for one week. Two single-column indexes exist; why does a composite one still help?",
    explain: "SQLite uses one index per table here. A picks idx_flights_origin, reads every Denver flight in the quarter, discards the other weeks, and groups in a temporary B-tree. B's (origin, flight_date) index narrows to Denver and the week at once, already in date order, and covers the query so the table is not read.",
    takeaway: "Two single-column indexes are not the same as one composite index. Build composites around the filters that are used together.",
    a: { label: "single-column indexes", query: "SELECT flight_date, COUNT(*) AS departures FROM flights WHERE origin = 'DEN' AND flight_date BETWEEN '2025-03-01' AND '2025-03-07' GROUP BY flight_date" },
    b: { label: "composite index", setup: "CREATE INDEX idx_flights_origin_date ON flights(origin, flight_date)", query: "SELECT flight_date, COUNT(*) AS departures FROM flights WHERE origin = 'DEN' AND flight_date BETWEEN '2025-03-01' AND '2025-03-07' GROUP BY flight_date" },
  }),

  // Product / SaaS Analytics
  c({
    id: "saas-account-time", datasetId: "saas", title: "date() on the second index column",
    question: "Event counts for one workspace since April 2025. Both use the (account_id, occurred_at) index; what is different?",
    explain: "Both plans SEARCH idx_events_account_id_occurred_at. In A, date(occurred_at) means only account_id can be used to seek, so SQLite reads every event the account ever produced and tests the date on each. In B the range on the bare column is part of the seek (account_id=? AND occurred_at>?), so older events are never read.",
    takeaway: "A function on any indexed column stops the seek at that column. Compare the plans' search terms, not just the index name.",
    a: { label: "date() on occurred_at", query: "SELECT event_name, COUNT(*) AS deliveries FROM events WHERE account_id = 1290 AND date(occurred_at) >= '2025-04-01' GROUP BY event_name ORDER BY event_name" },
    b: { label: "range on occurred_at", query: "SELECT event_name, COUNT(*) AS deliveries FROM events WHERE account_id = 1290 AND occurred_at >= '2025-04-01' GROUP BY event_name ORDER BY event_name" },
  }),
  c({
    id: "saas-event-type-time", datasetId: "saas", title: "Event type + time index",
    question: "How many subscription upgrades happened in Q1 2025? Which index fits a question about one event type?",
    explain: "No index starts with event_name. In A SQLite skip-scans the (account_id, occurred_at) index (ANY(account_id)): it jumps through every account's Q1 range and reads each matching event to check its name. B's (event_name, occurred_at) index goes straight to subscription_upgraded in Q1 and counts entries without touching the table.",
    takeaway: "Index for the question being asked. Event analytics usually filter by event type and time, so that pair belongs at the front of an index.",
    a: { label: "existing indexes", query: "SELECT COUNT(*) AS upgrades FROM events WHERE event_name = 'subscription_upgraded' AND occurred_at >= '2025-01-01' AND occurred_at < '2025-04-01'" },
    b: { label: "(event_name, occurred_at)", setup: "CREATE INDEX idx_events_name_time ON events(event_name, occurred_at)", query: "SELECT COUNT(*) AS upgrades FROM events WHERE event_name = 'subscription_upgraded' AND occurred_at >= '2025-01-01' AND occurred_at < '2025-04-01'" },
  }),

  // Mobility
  c({
    id: "mobility-day-range", datasetId: "mobility", title: "date() vs time range",
    question: "The first 20 taxi trips on Valentine's Day. Why does A walk the pickup index from the start of the quarter?",
    explain: "Both plans use idx_trips_pickup_at, which also gives the ORDER BY for free. A applies date() to each entry, so SQLite reads the index in order from 31 December and only starts returning rows when it reaches 14 February. B seeks directly to the first pickup on 14 February.",
    takeaway: "Using an index is not the same as searching it. SCAN … USING INDEX reads the index in order; SEARCH jumps to a position.",
    a: { label: "date() on pickup_at", query: "SELECT trip_id, pickup_at, total_amount FROM trips WHERE date(pickup_at) = '2025-02-14' ORDER BY pickup_at LIMIT 20" },
    b: { label: "pickup_at range", query: "SELECT trip_id, pickup_at, total_amount FROM trips WHERE pickup_at >= '2025-02-14' AND pickup_at < '2025-02-15' ORDER BY pickup_at LIMIT 20" },
  }),
  c({
    id: "mobility-zone-time", datasetId: "mobility", title: "Composite (pickup_zone_id, pickup_at)",
    question: "Trips from JFK Airport (zone 132) in one week. What does SQLite read with a zone-only index?",
    explain: "A uses idx_trips_pickup_zone_id and reads every JFK pickup in the quarter, then filters by time. B seeks to JFK and the week in one step, so only that week's trips are read.",
    takeaway: "Selective equality first, range second. The narrower the seek, the fewer rows SQLite has to read and discard.",
    a: { label: "zone index only", query: "SELECT COUNT(*) AS trips, ROUND(AVG(total_amount), 2) AS avg_total FROM trips WHERE pickup_zone_id = 132 AND pickup_at >= '2025-02-10' AND pickup_at < '2025-02-17'" },
    b: { label: "composite index", setup: "CREATE INDEX idx_trips_zone_time ON trips(pickup_zone_id, pickup_at)", query: "SELECT COUNT(*) AS trips, ROUND(AVG(total_amount), 2) AS avg_total FROM trips WHERE pickup_zone_id = 132 AND pickup_at >= '2025-02-10' AND pickup_at < '2025-02-17'" },
  }),

  // Weather
  c({
    id: "weather-station-year", datasetId: "weather", title: "Station + date range on the primary key",
    question: "Chicago Midway's 2023 observations. The primary key is (station_id, observation_date); how much of it does each query use?",
    explain: "Both SEARCH the primary-key index. A can only seek on station_id because strftime() hides observation_date, so it reads all three years for the station and tests each date. B seeks on both key columns and reads exactly the 365 days of 2023.",
    takeaway: "A composite primary key is an index too. Range conditions on its later columns only help when they are written on the bare column.",
    a: { label: "strftime() on the date", query: "SELECT observation_date, tmax_c, precipitation_mm FROM daily_weather WHERE station_id = 'USW00014819' AND strftime('%Y', observation_date) = '2023' ORDER BY observation_date" },
    b: { label: "date range", query: "SELECT observation_date, tmax_c, precipitation_mm FROM daily_weather WHERE station_id = 'USW00014819' AND observation_date >= '2023-01-01' AND observation_date < '2024-01-01' ORDER BY observation_date" },
  }),

  // Energy
  c({
    id: "energy-daily-peak", datasetId: "energy", title: "Covering index for a regional time series",
    question: "PJM's daily peak demand in June 2024. Why does A sort when B does not?",
    explain: "A searches the primary key (ba_code, hour_ending_utc) for PJM, reads all six months of its hours from the table, filters local_date, and groups in a temporary B-tree. B's index is ordered by (ba_code, local_date) and also holds demand_mw, so SQLite reads June's entries already grouped by day and never touches the table.",
    takeaway: "When the GROUP BY column follows the equality column in an index, SQLite can group while reading instead of sorting afterwards.",
    a: { label: "primary key only", query: "SELECT local_date, MAX(demand_mw) AS peak_mw FROM hourly_demand WHERE ba_code = 'PJM' AND local_date BETWEEN '2024-06-01' AND '2024-06-30' GROUP BY local_date" },
    b: { label: "covering index", setup: "CREATE INDEX idx_hourly_demand_ba_local ON hourly_demand(ba_code, local_date, demand_mw)", query: "SELECT local_date, MAX(demand_mw) AS peak_mw FROM hourly_demand WHERE ba_code = 'PJM' AND local_date BETWEEN '2024-06-01' AND '2024-06-30' GROUP BY local_date" },
  }),

  // Finance / Payments
  c({
    id: "payments-join-key", datasetId: "payments", title: "Index on the join key",
    question: "Top gas-station merchants by card spend. What changes when transactions.merchant_id is indexed?",
    explain: "Without an index on transactions.merchant_id, A scans all 84,798 transactions and looks up each one's merchant (with a Bloom filter to skip non-matches quickly). With the index, B starts from the 99 gas-station merchants (via idx_merchants_category) and searches each merchant's transactions directly.",
    takeaway: "Foreign keys are not indexed automatically in SQLite. Index the child side of a join when queries start from the parent.",
    a: { label: "no index on merchant_id", query: "SELECT m.merchant_name, COUNT(*) AS purchases, SUM(-t.amount_cents) / 100.0 AS spent FROM merchants m JOIN transactions t ON t.merchant_id = m.merchant_id WHERE m.category = 'Gas stations' GROUP BY m.merchant_id ORDER BY spent DESC LIMIT 10" },
    b: { label: "index on merchant_id", setup: "CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id)", query: "SELECT m.merchant_name, COUNT(*) AS purchases, SUM(-t.amount_cents) / 100.0 AS spent FROM merchants m JOIN transactions t ON t.merchant_id = m.merchant_id WHERE m.category = 'Gas stations' GROUP BY m.merchant_id ORDER BY spent DESC LIMIT 10" },
  }),
  c({
    id: "payments-merchant-time", datasetId: "payments", title: "Composite (merchant_id, requested_at)",
    question: "One merchant's June authorizations in time order. Where does the extra sort in A come from?",
    explain: "A finds the merchant's authorizations through idx_authorizations_merchant_id, filters the dates, then sorts the survivors in a temporary B-tree. B's index keeps each merchant's authorizations in time order (with the row id as the final tie-breaker), so the seek returns them already sorted.",
    takeaway: "If the plan says USE TEMP B-TREE FOR ORDER BY, ask whether the ORDER BY columns could follow the WHERE columns in an index.",
    a: { label: "merchant index only", query: "SELECT authorization_id, requested_at, amount, status FROM authorizations WHERE merchant_id = 961 AND requested_at >= '2025-06-01' ORDER BY requested_at, authorization_id" },
    b: { label: "composite index", setup: "CREATE INDEX idx_authorizations_merchant_time ON authorizations(merchant_id, requested_at)", query: "SELECT authorization_id, requested_at, amount, status FROM authorizations WHERE merchant_id = 961 AND requested_at >= '2025-06-01' ORDER BY requested_at, authorization_id" },
  }),

  // Healthcare
  c({
    id: "healthcare-provider-time", datasetId: "healthcare", title: "Provider schedule by date",
    question: "One clinician's 2025 encounters in time order. What does a (provider_id, start_at) index remove?",
    explain: "A reads all of provider 352's encounters since 2022 through idx_encounters_provider_id, drops the earlier years, and sorts the rest. B seeks to the provider's first 2025 encounter and reads forward in order, so there is no date filtering afterwards and no temporary B-tree.",
    takeaway: "Per-entity timelines (a provider's schedule, a patient's history) are the classic case for an (entity, time) index.",
    a: { label: "provider index only", query: "SELECT encounter_id, patient_id, encounter_class, start_at FROM encounters WHERE provider_id = 352 AND start_at >= '2025-01-01' ORDER BY start_at, encounter_id" },
    b: { label: "composite index", setup: "CREATE INDEX idx_encounters_provider_time ON encounters(provider_id, start_at)", query: "SELECT encounter_id, patient_id, encounter_class, start_at FROM encounters WHERE provider_id = 352 AND start_at >= '2025-01-01' ORDER BY start_at, encounter_id" },
  }),

  // IoT / Sensors
  c({
    id: "iot-negative-filter", datasetId: "iot", title: "<> vs IN with the same index",
    question: "Devices with faulty or out-of-range readings. Both queries create the same (quality_flag, device_id) index; why does only B use it to search?",
    explain: "An index can jump to values, not to “everything except a value”. A asks for quality_flag <> 'ok', so SQLite walks a whole index (here the device index, for its GROUP BY order) and tests 150,425 readings. B lists the two bad flags explicitly, so SQLite searches the new index for each one and reads only 674 entries, then groups them.",
    takeaway: "Negative conditions (<>, NOT IN, NOT LIKE) cannot seek. When the wanted values are a small known set, name them.",
    a: { label: "quality_flag <> 'ok'", setup: "CREATE INDEX idx_sensor_readings_quality ON sensor_readings(quality_flag, device_id)", query: "SELECT device_id, COUNT(*) AS bad_readings FROM sensor_readings WHERE quality_flag <> 'ok' GROUP BY device_id ORDER BY device_id" },
    b: { label: "quality_flag IN (…)", setup: "CREATE INDEX idx_sensor_readings_quality ON sensor_readings(quality_flag, device_id)", query: "SELECT device_id, COUNT(*) AS bad_readings FROM sensor_readings WHERE quality_flag IN ('fault', 'out_of_range') GROUP BY device_id ORDER BY device_id" },
  }),

  // Logistics
  c({
    id: "logistics-tracking-timeline", datasetId: "logistics", title: "Tracking timeline in arrival order",
    question: "A package's scans in the order they were recorded. The existing index is (package_id, event_at); why is that not enough?",
    explain: "A finds the package's 18 scans through the existing index, but that index is ordered by event_at, not recorded_at, so SQLite sorts them. B's (package_id, recorded_at) index returns them already in recorded order. Late and out-of-order scans are exactly why the two orders differ.",
    takeaway: "An index helps ORDER BY only if it is ordered by those columns. Same table, same filter, different sort column: different index.",
    a: { label: "(package_id, event_at)", query: "SELECT event_id, event_type, event_at, recorded_at FROM tracking_events WHERE package_id = 5419 ORDER BY recorded_at, event_id" },
    b: { label: "(package_id, recorded_at)", setup: "CREATE INDEX idx_tracking_events_package_recorded ON tracking_events(package_id, recorded_at)", query: "SELECT event_id, event_type, event_at, recorded_at FROM tracking_events WHERE package_id = 5419 ORDER BY recorded_at, event_id" },
  }),
  c({
    id: "logistics-carrier-date", datasetId: "logistics", title: "Carrier + date lookup",
    question: "One carrier's April shipments. Which single-column index does SQLite pick, and what does it cost?",
    explain: "A has an index on carrier_id and another on created_at. SQLite chooses created_at, reads every carrier's April shipments and discards the other carriers. B's (carrier_id, created_at) index reads only this carrier's April shipments, in date order.",
    takeaway: "With several single-column indexes SQLite estimates which one filters best and uses that one. A composite index makes both conditions part of the seek.",
    a: { label: "single-column indexes", query: "SELECT shipment_id, order_reference, created_at FROM shipments WHERE carrier_id = 2 AND created_at >= '2025-04-01' ORDER BY created_at" },
    b: { label: "composite index", setup: "CREATE INDEX idx_shipments_carrier_created ON shipments(carrier_id, created_at)", query: "SELECT shipment_id, order_reference, created_at FROM shipments WHERE carrier_id = 2 AND created_at >= '2025-04-01' ORDER BY created_at" },
  }),

  // Developer Platform
  c({
    id: "developer-repo-recent", datasetId: "developer", title: "Latest pull requests for a repository",
    question: "The 20 newest pull requests in the busiest repository. Why does A sort all of them to return 20?",
    explain: "A finds the repository's 289 pull requests via idx_pull_requests_repository_id and must sort them all in a temporary B-tree before LIMIT applies. B's (repository_id, created_at) index is read backwards from the newest entry, so SQLite stops after 20 rows.",
    takeaway: "ORDER BY … DESC LIMIT n is cheapest when an index already has that order: SQLite reads n entries and stops.",
    a: { label: "repository index only", query: "SELECT pull_request_id, title, created_at, state FROM pull_requests WHERE repository_id = 131 ORDER BY created_at DESC LIMIT 20" },
    b: { label: "composite index", setup: "CREATE INDEX idx_pull_requests_repo_created ON pull_requests(repository_id, created_at)", query: "SELECT pull_request_id, title, created_at, state FROM pull_requests WHERE repository_id = 131 ORDER BY created_at DESC LIMIT 20" },
  }),
  c({
    id: "developer-status-time", datasetId: "developer", title: "Deployments by status and time",
    question: "Rolled-back deployments since April 2025. No index starts with status; what does SQLite do instead?",
    explain: "A skip-scans the (repository_id, started_at) index: for every repository it jumps to April and reads each deployment to check its status, then sorts. B's (status, started_at) index seeks to rolled_back since April and returns the 52 rows in time order.",
    takeaway: "Rare statuses are very selective. An index that starts with the status makes “show me the failures” queries cheap.",
    a: { label: "existing indexes", query: "SELECT deployment_id, repository_id, environment, started_at FROM deployments WHERE status = 'rolled_back' AND started_at >= '2025-04-01' ORDER BY started_at" },
    b: { label: "(status, started_at)", setup: "CREATE INDEX idx_deployments_status_started ON deployments(status, started_at)", query: "SELECT deployment_id, repository_id, environment, started_at FROM deployments WHERE status = 'rolled_back' AND started_at >= '2025-04-01' ORDER BY started_at" },
  }),

  // Sports
  c({
    id: "sports-team-or", datasetId: "sports", title: "IN (two columns) vs OR",
    question: "Seattle's 2025 games, home or away. Two ways to say “either column”: which one can use the team indexes?",
    explain: "'SEA' IN (home_team_id, away_team_id) is a test SQLite can only evaluate row by row, so A walks the game_date index across all ten seasons. B's OR of two plain equalities lets SQLite search idx_games_home_team_id and idx_games_away_team_id separately and combine the results (MULTI-INDEX OR), then sort them by date.",
    takeaway: "Write each condition on a bare indexed column. SQLite can combine indexes for an OR of simple comparisons.",
    a: { label: "value IN (col, col)", query: "SELECT game_id, game_date, home_team_id, away_team_id, home_score, away_score FROM games WHERE 'SEA' IN (home_team_id, away_team_id) AND season = 2025 ORDER BY game_date, game_id" },
    b: { label: "col = value OR col = value", query: "SELECT game_id, game_date, home_team_id, away_team_id, home_score, away_score FROM games WHERE (home_team_id = 'SEA' OR away_team_id = 'SEA') AND season = 2025 ORDER BY game_date, game_id" },
  }),
];

export const comparisonsFor = (id: CanonicalDatasetId) => performanceComparisons.filter((p) => p.datasetId === id);

/**
 * The worker request for one comparison. Each approach gets its own fresh copy of the dataset; the
 * worker runs `query` (setup included) and then `plan` on that same copy, so setup is not repeated.
 */
export function comparisonCases(p: PerformanceComparison) {
  return [p.a, p.b].map((x) => ({
    label: x.label,
    query: x.setup ? `${x.setup};\n${x.query}` : x.query,
    plan: `EXPLAIN QUERY PLAN ${x.query}`,
  }));
}
