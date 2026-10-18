import { quiz, step, task, type LessonOverrides } from "./spec";

const REGULAR_2025 = "JOIN games g ON g.game_id = s.game_id WHERE g.game_type = 'regular'";

/** Window functions: lessons 21–25, 40–43, 53, 57. */
export const windowLessons: LessonOverrides = {
  21: {
    dataset: "flights", decision: "MIGRATE", reason: "ROW_NUMBER now numbers real aircraft rotations.",
    concept: "A window function computes a value for each row from a set of related rows, without collapsing them. ROW_NUMBER() OVER (PARTITION BY … ORDER BY …) numbers rows 1, 2, 3 … within each partition in the given order. Add a tie-breaker so the numbering is deterministic.",
    trap: "Without ORDER BY inside OVER, the numbering order is undefined; a different plan can number the same rows differently.",
    grain: "One row per flight, then one row per aircraft.",
    example: "SELECT flight_id, origin, scheduled_departure,\n  ROW_NUMBER() OVER (PARTITION BY origin ORDER BY scheduled_departure, flight_id) AS departure_number\nFROM flights\nWHERE flight_date = '2025-01-15' AND origin = 'DEN';",
    hints: ["PARTITION BY tail_number ORDER BY scheduled_departure, flight_id.", "Number each aircraft’s February flights, then keep rows numbered 1."],
    tasks: [
      task("Find every flight on 2025-01-15 with a tail number. Return flight_id, tail_number and leg: the aircraft’s flight number that day, ordered by scheduled_departure then flight_id.", "SELECT flight_id, tail_number, ROW_NUMBER() OVER (PARTITION BY tail_number ORDER BY scheduled_departure, flight_id) AS leg FROM flights WHERE flight_date = '2025-01-15' AND tail_number IS NOT NULL"),
      task("Find each aircraft’s first scheduled flight in February 2025 (cancelled flights count; break ties by the smaller flight_id). Return flight_id, tail_number and scheduled_departure.", "SELECT flight_id, tail_number, scheduled_departure FROM (SELECT flight_id, tail_number, scheduled_departure, ROW_NUMBER() OVER (PARTITION BY tail_number ORDER BY scheduled_departure, flight_id) AS rn FROM flights WHERE tail_number IS NOT NULL AND flight_date >= '2025-02-01' AND flight_date < '2025-03-01') WHERE rn = 1"),
    ],
    quiz: quiz("What does PARTITION BY tail_number do in ROW_NUMBER()?", ["Restarts the numbering for each aircraft", "Sorts the final output", "Removes duplicate aircraft"], 0, "Each partition is numbered independently, starting at 1."),
    walkthrough: [
      step("Follow one plane through the day", "Run this. You see every leg for one busy aircraft on 2025-01-15, sorted by when it was scheduled to leave—same plane, many flights in order.", "SELECT flight_id, tail_number, origin, destination, scheduled_departure FROM flights WHERE flight_date = '2025-01-15' AND tail_number = (SELECT tail_number FROM flights WHERE flight_date = '2025-01-15' AND tail_number IS NOT NULL GROUP BY tail_number ORDER BY COUNT(*) DESC, tail_number LIMIT 1) ORDER BY scheduled_departure;"),
      step("Number departures at each airport", "Run this. ROW_NUMBER() assigns 1, 2, 3… within each origin airport, ordered by departure time. That is how you label “first DEN departure,” “second DEN departure,” and so on.", "SELECT flight_id, origin, scheduled_departure, ROW_NUMBER() OVER (PARTITION BY origin ORDER BY scheduled_departure, flight_id) AS departure_number FROM flights WHERE flight_date = '2025-01-15' AND origin = 'DEN';"),
    ],
  },
  22: {
    dataset: "sports", decision: "MIGRATE", reason: "RANK and DENSE_RANK over real 2025 MLB home-run totals with genuine ties.",
    concept: "RANK and DENSE_RANK give equal values the same rank. After a tie, RANK skips positions (1, 2, 2, 4) and DENSE_RANK does not (1, 2, 2, 3). Aggregate first to the grain you want to rank, then apply the window.",
    trap: "Ranking batting lines instead of player totals ranks single games, not seasons.",
    grain: "One row per qualifying player.",
    example: "SELECT team_id, wins,\n  RANK() OVER (ORDER BY wins DESC) AS wins_rank\nFROM standings\nWHERE season = 2024 AND as_of_date = (SELECT last_regular_date FROM seasons WHERE season = 2024);",
    hints: ["Sum home_runs per player in a subquery or CTE, then RANK() OVER (ORDER BY home_runs DESC).", "DENSE_RANK() OVER (PARTITION BY team_id ORDER BY home_runs DESC)."],
    tasks: [
      task(`For the 2025 regular season, return player_id, home_runs and hr_rank for players with at least 20 home runs. hr_rank uses RANK over total home runs, highest first; equal totals share a rank.`, `SELECT player_id, home_runs, RANK() OVER (ORDER BY home_runs DESC) AS hr_rank FROM (SELECT s.player_id, SUM(s.home_runs) AS home_runs FROM player_game_stats s ${REGULAR_2025} GROUP BY s.player_id HAVING SUM(s.home_runs) >= 20)`),
      task(`For the 2025 regular season, return team_id, player_id, home_runs and team_rank for players with at least one home run for that team. team_rank is the DENSE_RANK of the player’s home runs for the team, highest first.`, `SELECT team_id, player_id, home_runs, DENSE_RANK() OVER (PARTITION BY team_id ORDER BY home_runs DESC) AS team_rank FROM (SELECT s.team_id, s.player_id, SUM(s.home_runs) AS home_runs FROM player_game_stats s ${REGULAR_2025} GROUP BY s.team_id, s.player_id HAVING SUM(s.home_runs) >= 1)`),
    ],
    quiz: quiz("Scores 50, 40, 40, 30. What are the DENSE_RANK values?", ["1, 2, 2, 4", "1, 2, 2, 3", "1, 2, 3, 4"], 1, "DENSE_RANK leaves no gap after the tie."),
    walkthrough: [
      step("Add up home runs per player", "Run this first. Each row is one player’s total home runs for the 2025 regular season—you rank totals like this, not single-game lines.", `SELECT s.player_id, SUM(s.home_runs) AS home_runs FROM player_game_stats s ${REGULAR_2025} GROUP BY s.player_id ORDER BY home_runs DESC LIMIT 15;`),
      step("Rank teams by win total", "Run this. RANK() gives the same number to teams tied on wins and skips the next slot after a tie (1, 2, 2, 4).", "SELECT team_id, wins, RANK() OVER (ORDER BY wins DESC) AS wins_rank FROM standings WHERE season = 2024 AND as_of_date = (SELECT last_regular_date FROM seasons WHERE season = 2024);"),
    ],
  },
  23: {
    dataset: "payments", decision: "MIGRATE", reason: "Running balances on a real-shaped bank ledger with opening balances.",
    concept: "SUM(amount) OVER (ORDER BY … ROWS UNBOUNDED PRECEDING) accumulates a running total row by row. PARTITION BY restarts it for each account or period. Adding the opening balance turns cumulative movements into a running balance.",
    trap: "Without a unique tie-breaker, entries posted at the same instant can be accumulated in any order; with the default RANGE frame, tied rows also share one total.",
    grain: "One row per posted ledger entry.",
    example: "SELECT transaction_id, posted_at, amount_cents,\n  SUM(amount_cents) OVER (ORDER BY posted_at, transaction_id ROWS UNBOUNDED PRECEDING) AS cumulative_cents\nFROM transactions\nWHERE account_id = 3 AND status = 'posted';",
    hints: ["Add the account’s opening_balance_cents to the running SUM.", "PARTITION BY account_id, substr(posted_at, 1, 7)."],
    tasks: [
      task("Find account 6’s posted entries. Return transaction_id, posted_at, amount_cents and balance_cents: the opening balance plus all posted amounts up to and including this entry, ordered by posted_at then transaction_id.", "SELECT t.transaction_id, t.posted_at, t.amount_cents, a.opening_balance_cents + SUM(t.amount_cents) OVER (ORDER BY t.posted_at, t.transaction_id ROWS UNBOUNDED PRECEDING) AS balance_cents FROM transactions t JOIN accounts a ON a.account_id = t.account_id WHERE t.account_id = 6 AND t.status = 'posted'"),
      task("Find posted entries on accounts 1–50. Return account_id, transaction_id, posted_at and month_to_date_cents: the running sum of amount_cents within the account and calendar month of posted_at, ordered by posted_at then transaction_id.", "SELECT account_id, transaction_id, posted_at, SUM(amount_cents) OVER (PARTITION BY account_id, substr(posted_at, 1, 7) ORDER BY posted_at, transaction_id ROWS UNBOUNDED PRECEDING) AS month_to_date_cents FROM transactions WHERE status = 'posted' AND account_id BETWEEN 1 AND 50"),
    ],
    quiz: quiz("Which frame makes a running total advance one row at a time even when timestamps tie?", ["RANGE UNBOUNDED PRECEDING", "ROWS UNBOUNDED PRECEDING with a unique tie-breaker in ORDER BY", "No frame"], 1, "ROWS counts physical rows; the tie-breaker fixes their order."),
    walkthrough: [
      step("See account 3’s transactions", "Run this. Deposits show as positive cents and spending as negative, in the order they posted.", "SELECT transaction_id, transaction_type, status, amount_cents, posted_at FROM transactions WHERE account_id = 3 ORDER BY posted_at, transaction_id LIMIT 15;"),
      step("Build a running total", "Run this. SUM() OVER adds each posted amount to everything before it on this account, row by row—that is a running balance of movements only.", "SELECT transaction_id, posted_at, amount_cents, SUM(amount_cents) OVER (ORDER BY posted_at, transaction_id ROWS UNBOUNDED PRECEDING) AS cumulative_cents FROM transactions WHERE account_id = 3 AND status = 'posted';"),
    ],
  },
  24: {
    dataset: "flights", decision: "MIGRATE", reason: "LAG follows real aircraft rotations, exposing delay propagation and turnarounds.",
    concept: "LAG(column) returns the value from the previous row in the window order; LEAD returns the next. With PARTITION BY tail_number ORDER BY scheduled_departure, the previous row is the same aircraft’s previous flight, so you can compare consecutive legs.",
    trap: "The first row of each partition has no previous row: LAG returns NULL, not zero. Local times are only comparable at the same airport, which is exactly where an aircraft arrives and departs again.",
    grain: "One row per operated flight.",
    example: "SELECT flight_id, tail_number, origin, destination,\n  LAG(destination) OVER (PARTITION BY tail_number ORDER BY scheduled_departure, flight_id) AS previous_destination\nFROM flights\nWHERE flight_date = '2025-01-15' AND tail_number IS NOT NULL;",
    hints: ["LAG(arrival_delay) OVER (PARTITION BY tail_number ORDER BY scheduled_departure, flight_id).", "LAG(actual_arrival) is the previous leg’s arrival time. The first flight of the day is NULL."],
    tasks: [
      task("Find operated flights (cancelled = 0) on 2025-01-15 with a tail number. Return flight_id, tail_number, arrival_delay and previous_arrival_delay: the arrival delay of the same aircraft’s previous operated flight that day.", "SELECT flight_id, tail_number, arrival_delay, LAG(arrival_delay) OVER (PARTITION BY tail_number ORDER BY scheduled_departure, flight_id) AS previous_arrival_delay FROM flights WHERE flight_date = '2025-01-15' AND cancelled = 0 AND tail_number IS NOT NULL"),
      task("Find the same flights. Return flight_id, tail_number, actual_departure and previous_arrival: the actual_arrival of the same aircraft’s previous operated flight that day. The first flight of the day gets NULL for previous_arrival.", "SELECT flight_id, tail_number, actual_departure, LAG(actual_arrival) OVER (PARTITION BY tail_number ORDER BY scheduled_departure, flight_id) AS previous_arrival FROM flights WHERE flight_date = '2025-01-15' AND cancelled = 0 AND tail_number IS NOT NULL"),
    ],
    quiz: quiz("What does LAG return on the first row of a partition?", ["0", "NULL", "The same row’s value"], 1, "There is no previous row, so the result is NULL unless you supply a default."),
    walkthrough: [
      step("Look at the previous leg", "Run this. LAG() pulls the prior row’s destination for the same tail number—handy for spotting whether origin matches where the plane last landed.", "SELECT flight_id, tail_number, origin, destination, LAG(destination) OVER (PARTITION BY tail_number ORDER BY scheduled_departure, flight_id) AS previous_destination FROM flights WHERE flight_date = '2025-01-15' AND tail_number IS NOT NULL LIMIT 20;"),
      step("Compare delay to the last arrival", "Run this. For each operated flight you see this leg’s departure delay beside the previous leg’s arrival delay on that aircraft. The first leg of the day shows NULL for the lag column.", "SELECT flight_id, tail_number, departure_delay, LAG(arrival_delay) OVER (PARTITION BY tail_number ORDER BY scheduled_departure, flight_id) AS previous_arrival_delay FROM flights WHERE flight_date = '2025-01-15' AND cancelled = 0 AND tail_number IS NOT NULL LIMIT 20;"),
    ],
  },
  25: {
    dataset: "logistics", decision: "MIGRATE", reason: "Latest state per package from a real-shaped scan stream with duplicates and late events.",
    concept: "To keep the latest row per group, number each group’s rows newest first with ROW_NUMBER() and keep row 1. Order by the time the event happened, not the order it arrived, and add a tie-breaker. An as-of cutoff filters events before ranking.",
    trap: "MAX(event_at) with GROUP BY returns the latest time but not the matching event_type; picking event_type alongside it is unreliable.",
    grain: "One row per package.",
    example: "SELECT package_id, event_type, event_at\nFROM tracking_events\nWHERE package_id = 1\nORDER BY event_at DESC, event_id DESC;",
    hints: ["ROW_NUMBER() OVER (PARTITION BY package_id ORDER BY event_at DESC, event_id DESC), then WHERE rn = 1.", "Filter event_at < '2025-03-01 00:00:00' inside the subquery before numbering."],
    tasks: [
      task("Find each package’s most recent event by event_at (ties broken by the highest event_id) in packages in shipments created in February 2025. Return package_id, event_type and event_at.", "SELECT package_id, event_type, event_at FROM (SELECT e.package_id, e.event_type, e.event_at, ROW_NUMBER() OVER (PARTITION BY e.package_id ORDER BY e.event_at DESC, e.event_id DESC) AS rn FROM tracking_events e JOIN packages p ON p.package_id = e.package_id JOIN shipments s ON s.shipment_id = p.shipment_id WHERE s.created_at >= '2025-02-01' AND s.created_at < '2025-03-01') WHERE rn = 1"),
      task("Find the latest event strictly before 2025-03-01 00:00:00 (ties by highest event_id) in the same packages. Return package_id, event_type and event_at. Omit packages with no earlier event.", "SELECT package_id, event_type, event_at FROM (SELECT e.package_id, e.event_type, e.event_at, ROW_NUMBER() OVER (PARTITION BY e.package_id ORDER BY e.event_at DESC, e.event_id DESC) AS rn FROM tracking_events e JOIN packages p ON p.package_id = e.package_id JOIN shipments s ON s.shipment_id = p.shipment_id WHERE s.created_at >= '2025-02-01' AND s.created_at < '2025-03-01' AND e.event_at < '2025-03-01 00:00:00') WHERE rn = 1"),
    ],
    quiz: quiz("Why order by event_at rather than event_id?", ["event_id is not unique", "event_id is the arrival order, and late events arrive after newer ones", "They are always the same"], 1, "Ingestion order differs from event order when scans arrive late."),
    walkthrough: [
      step("Scroll one package’s scans", "Run this. Scans for package 1 appear newest first by event_at—the same order you want when asking “where is it now?”", "SELECT package_id, event_type, event_at, recorded_at FROM tracking_events WHERE package_id = 1 ORDER BY event_at DESC, event_id DESC;"),
      step("Mark the latest event per package", "Run this. ROW_NUMBER() gives 1 to the newest scan in each package group; that row is the current status when ties are broken by event_id.", "SELECT package_id, event_type, event_at, ROW_NUMBER() OVER (PARTITION BY package_id ORDER BY event_at DESC, event_id DESC) AS rn FROM tracking_events WHERE package_id <= 3;"),
    ],
  },
  40: {
    dataset: "iot", decision: "MIGRATE", reason: "LEAD measures real reporting gaps, including retransmitted duplicates.",
    concept: "LEAD(column) reads the next row in the window order. LEAD(recorded_at) gives the time of the next reading. Deduplicate first: a retransmitted reading repeats a timestamp. Turning those two timestamps into a number of minutes comes after date differences.",
    trap: "The last reading of each device has no next reading, so LEAD returns NULL; treat it as unknown, not as a zero gap.",
    grain: "One row per device and reading time.",
    example: "SELECT reading_id, device_id, recorded_at,\n  LEAD(recorded_at) OVER (PARTITION BY device_id ORDER BY recorded_at, reading_id) AS next_recorded_at\nFROM sensor_readings\nWHERE device_id = 1 AND recorded_at >= '2025-03-10' AND recorded_at < '2025-03-11';",
    hints: ["LEAD(recorded_at) OVER (ORDER BY recorded_at, reading_id).", "PARTITION BY device_id so each cold-storage device has its own next reading. DISTINCT first, so a repeated timestamp is one row."],
    tasks: [
      task("Find device 1 on 2025-03-10. Return reading_id, recorded_at, value and next_recorded_at: the recorded_at of the device’s next reading, ordered by recorded_at then reading_id.", "SELECT reading_id, recorded_at, value, LEAD(recorded_at) OVER (ORDER BY recorded_at, reading_id) AS next_recorded_at FROM sensor_readings WHERE device_id = 1 AND recorded_at >= '2025-03-10' AND recorded_at < '2025-03-11'"),
      task("Find cold-storage devices (sensor_type_id = 1) during 2025-03-10. Keep one row per device and recorded_at. Return device_id, recorded_at, and next_recorded_at: that device’s next distinct reading time. The last reading of the day is NULL.", "SELECT device_id, recorded_at, LEAD(recorded_at) OVER (PARTITION BY device_id ORDER BY recorded_at) AS next_recorded_at FROM (SELECT DISTINCT r.device_id, r.recorded_at FROM sensor_readings r JOIN devices d ON d.device_id = r.device_id WHERE d.sensor_type_id = 1 AND r.recorded_at >= '2025-03-10' AND r.recorded_at < '2025-03-11')"),
    ],
    quiz: quiz("A device sends the same reading twice. What gap does LEAD measure between the copies?", ["The reporting interval", "Zero", "NULL"], 1, "Both copies share recorded_at, so remove duplicates before measuring gaps."),
    walkthrough: [
      step("Peek at the next reading", "Run this. LEAD() shows when the same device reported again. The last reading of the day has no next time.", "SELECT reading_id, device_id, recorded_at, LEAD(recorded_at) OVER (PARTITION BY device_id ORDER BY recorded_at, reading_id) AS next_recorded_at FROM sensor_readings WHERE device_id = 1 AND recorded_at >= '2025-03-10' AND recorded_at < '2025-03-11';"),
      step("Spot duplicate deliveries", "Run this. Rows with copies > 1 are the same reading sent twice; dedupe before you trust LEAD gaps.", "SELECT device_id, sequence_number, recorded_at, COUNT(*) AS copies FROM sensor_readings GROUP BY device_id, sequence_number, recorded_at HAVING COUNT(*) > 1 LIMIT 10;"),
    ],
  },
  41: {
    dataset: "payments", decision: "MIGRATE", reason: "Window frames on a real-shaped account ledger.",
    concept: "FIRST_VALUE and LAST_VALUE read a value at the edge of the window frame. With ORDER BY, the default frame ends at the current row, so LAST_VALUE returns the current row. Specify ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING to see the whole partition, or another frame for running extremes.",
    trap: "LAST_VALUE(x) OVER (ORDER BY t) without a frame returns the current row’s x, not the last row’s.",
    grain: "One row per posted ledger entry.",
    example: "SELECT transaction_id, amount_cents,\n  LAST_VALUE(amount_cents) OVER (ORDER BY posted_at, transaction_id) AS default_frame,\n  LAST_VALUE(amount_cents) OVER (ORDER BY posted_at, transaction_id ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS whole_partition\nFROM transactions\nWHERE account_id = 3 AND status = 'posted';",
    hints: ["Use ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING for the last value.", "MIN(amount_cents) OVER (PARTITION BY account_id ORDER BY posted_at, transaction_id ROWS UNBOUNDED PRECEDING)."],
    tasks: [
      task("Find account 6’s posted entries in April 2025. Return transaction_id, amount_cents, first_amount and last_amount: the amounts of the month’s first and last entries ordered by posted_at then transaction_id.", "SELECT transaction_id, amount_cents, FIRST_VALUE(amount_cents) OVER w AS first_amount, LAST_VALUE(amount_cents) OVER w AS last_amount FROM transactions WHERE account_id = 6 AND status = 'posted' AND posted_at >= '2025-04-01' AND posted_at < '2025-05-01' WINDOW w AS (ORDER BY posted_at, transaction_id ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING)"),
      task("Find posted entries on accounts 1–50. Return account_id, transaction_id, amount_cents and largest_debit_so_far: the most negative amount_cents in that account up to and including this entry, ordered by posted_at then transaction_id.", "SELECT account_id, transaction_id, amount_cents, MIN(amount_cents) OVER (PARTITION BY account_id ORDER BY posted_at, transaction_id ROWS UNBOUNDED PRECEDING) AS largest_debit_so_far FROM transactions WHERE status = 'posted' AND account_id BETWEEN 1 AND 50"),
    ],
    quiz: quiz("What frame does a window with ORDER BY and no frame clause use?", ["The whole partition", "From the partition start to the current row (and its peers)", "Only the current row"], 1, "The default is RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW."),
    walkthrough: [
      step("See the default window frame", "Run this. With ORDER BY and no frame clause, LAST_VALUE usually equals this row’s amount—not the last row in the account. The second column uses a full-partition frame so you can compare.", "SELECT transaction_id, amount_cents, LAST_VALUE(amount_cents) OVER (ORDER BY posted_at, transaction_id) AS default_frame, LAST_VALUE(amount_cents) OVER (ORDER BY posted_at, transaction_id ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS whole_partition FROM transactions WHERE account_id = 3 AND status = 'posted';"),
      step("Average the last three entries", "Run this. ROWS BETWEEN 2 PRECEDING AND CURRENT ROW averages this posted line and the two before it—a small sliding window on the ledger.", "SELECT transaction_id, amount_cents, AVG(amount_cents) OVER (ORDER BY posted_at, transaction_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS avg_last_three FROM transactions WHERE account_id = 3 AND status = 'posted';"),
    ],
  },
  42: {
    dataset: "iot", decision: "MIGRATE", reason: "Row-based versus time-based rolling averages on real-shaped telemetry with gaps.",
    concept: "A ROWS frame averages a fixed number of neighbouring rows. When readings are missing, “the previous three rows” can span many hours. A RANGE frame over a numeric time value (julianday) averages a fixed time span instead, however many readings it contains.",
    trap: "AVG over ROWS BETWEEN 2 PRECEDING AND CURRENT ROW after a three-hour outage mixes readings from before and after the gap as if they were consecutive.",
    grain: "One row per reading.",
    example: "SELECT recorded_at, value,\n  AVG(value) OVER (ORDER BY recorded_at, reading_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS avg_last_three\nFROM sensor_readings\nWHERE device_id = 2 AND recorded_at >= '2025-03-10' AND recorded_at < '2025-03-11';",
    hints: ["ROWS BETWEEN 2 PRECEDING AND CURRENT ROW.", "ORDER BY julianday(recorded_at) RANGE BETWEEN 0.125 PRECEDING AND CURRENT ROW (3 hours = 0.125 days)."],
    tasks: [
      task("Find device 1 in March 2025. Return reading_id, recorded_at, value and avg_3: the average of this and the two previous readings (ordered by recorded_at, reading_id), rounded to 2 decimals.", "SELECT reading_id, recorded_at, value, ROUND(AVG(value) OVER (ORDER BY recorded_at, reading_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS avg_3 FROM sensor_readings WHERE device_id = 1 AND recorded_at >= '2025-03-01' AND recorded_at < '2025-04-01'"),
      task("Find the same readings. Return reading_id, recorded_at and avg_3h: the average of the device’s values recorded in the 3 hours up to and including this reading (a time-based frame), rounded to 2 decimals.", "SELECT reading_id, recorded_at, ROUND(AVG(value) OVER (ORDER BY julianday(recorded_at) RANGE BETWEEN 0.125 PRECEDING AND CURRENT ROW), 2) AS avg_3h FROM sensor_readings WHERE device_id = 1 AND recorded_at >= '2025-03-01' AND recorded_at < '2025-04-01'"),
    ],
    quiz: quiz("Readings stop for 5 hours. A ROWS frame of 3 rows right after the gap includes…", ["Only readings from the last 3 hours", "Readings from before the gap", "Nothing"], 1, "ROWS counts rows regardless of time; RANGE over time respects the gap."),
    walkthrough: [
      step("Smooth with three row neighbors", "Run this. Each average uses this reading plus the two previous rows—even if those rows are hours apart.", "SELECT recorded_at, value, AVG(value) OVER (ORDER BY recorded_at, reading_id ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS avg_last_three FROM sensor_readings WHERE device_id = 2 AND recorded_at >= '2025-03-10' AND recorded_at < '2025-03-11';"),
      step("Find long gaps between readings", "Run this. LAG() measures hours since the prior reading on device 1; the largest values are outages, not normal spacing.", "SELECT device_id, recorded_at, ROUND((julianday(recorded_at) - julianday(LAG(recorded_at) OVER (PARTITION BY device_id ORDER BY recorded_at))) * 24, 1) AS hours_since_previous FROM sensor_readings WHERE device_id = 1 ORDER BY hours_since_previous DESC LIMIT 5;"),
      step("Count readings in six hours", "Run this. A RANGE frame on julianday() counts how many readings fell in the last six hours of clock time, not a fixed row count.", "SELECT recorded_at, value,\n  COUNT(*) OVER (ORDER BY julianday(recorded_at) RANGE BETWEEN 0.25 PRECEDING AND CURRENT ROW) AS readings_in_6h\nFROM sensor_readings\nWHERE device_id = 2 AND recorded_at >= '2025-03-10' AND recorded_at < '2025-03-11';"),
      step("Average over six clock hours", "Run this. The same time-based frame averages values from the last six hours only—after a long gap, fewer rows enter the average.", "SELECT recorded_at, value,\n  ROUND(AVG(value) OVER (ORDER BY julianday(recorded_at) RANGE BETWEEN 0.25 PRECEDING AND CURRENT ROW), 2) AS avg_6h\nFROM sensor_readings\nWHERE device_id = 2 AND recorded_at >= '2025-03-10' AND recorded_at < '2025-03-11';"),
    ],
  },
  43: {
    dataset: "energy", decision: "MIGRATE", reason: "Share-of-total over real EIA daily fuel mixes.",
    concept: "SUM(x) OVER () is the total of x over the whole result; dividing each row by it gives its share of the total. SUM(x) OVER (PARTITION BY group) gives each group’s total for per-group shares. Aggregate to the right grain first, then compute shares.",
    trap: "Pumped storage can make a daily fuel total negative, so a share can be negative; a zero total needs NULLIF to avoid dividing by zero.",
    grain: "One row per fuel, then one row per balancing authority and fuel.",
    example: "SELECT ba_code, SUM(generation_mwh) AS mwh,\n  ROUND(100.0 * SUM(generation_mwh) / SUM(SUM(generation_mwh)) OVER (), 2) AS share_pct\nFROM generation_by_fuel\nWHERE date = '2024-01-15'\nGROUP BY ba_code;",
    hints: ["Group by fuel_code, then divide by SUM(SUM(generation_mwh)) OVER ().", "Divide by NULLIF(SUM(generation_mwh) OVER (PARTITION BY ba_code), 0)."],
    tasks: [
      task("Find 2024-04-15. Return fuel_code, generation_mwh (summed over all balancing authorities) and share_pct: that fuel’s share of the day’s total generation, 0–100, rounded to 2 decimals.", "SELECT fuel_code, SUM(generation_mwh) AS generation_mwh, ROUND(100.0 * SUM(generation_mwh) / SUM(SUM(generation_mwh)) OVER (), 2) AS share_pct FROM generation_by_fuel WHERE date = '2024-04-15' GROUP BY fuel_code"),
      task("Find 2024-04-15. Return ba_code, fuel_code, generation_mwh and share_pct: the fuel’s share of that balancing authority’s total for the day, rounded to 2 decimals, NULL if the total is zero.", "SELECT ba_code, fuel_code, generation_mwh, ROUND(100.0 * generation_mwh / NULLIF(SUM(generation_mwh) OVER (PARTITION BY ba_code), 0), 2) AS share_pct FROM generation_by_fuel WHERE date = '2024-04-15'"),
    ],
    quiz: quiz("What does SUM(mwh) OVER () return on each row?", ["That row’s mwh", "The total of mwh over all rows of the result", "A running total"], 1, "An empty OVER () makes the whole result one window."),
    walkthrough: [
      step("See raw generation rows", "Run this. Each line is one balancing authority and fuel type on 2024-04-15 before you roll up or compute shares.", "SELECT ba_code, fuel_code, generation_mwh, hours_reported FROM generation_by_fuel WHERE date = '2024-04-15' ORDER BY ba_code, fuel_code LIMIT 20;"),
      step("Turn totals into percentages", "Run this. SUM() OVER () with empty parentheses is the day’s total across all authorities; dividing each group’s sum by that gives its share of generation.", "SELECT ba_code, SUM(generation_mwh) AS mwh, ROUND(100.0 * SUM(generation_mwh) / SUM(SUM(generation_mwh)) OVER (), 2) AS share_pct FROM generation_by_fuel WHERE date = '2024-01-15' GROUP BY ba_code;"),
    ],
  },
  53: {
    dataset: "sports", decision: "MIGRATE", reason: "Top-N per team with real 2025 ties.",
    concept: "Top-N per group = rank within each group, then filter. DENSE_RANK keeps every player at the top N distinct values, ties included; ROW_NUMBER keeps exactly N rows per group and needs a tie-breaker to decide who is cut.",
    trap: "LIMIT applies to the whole result, not to each team.",
    grain: "Up to a few rows per team.",
    example: "SELECT team_id, player_id, hits FROM (\n  SELECT s.team_id, s.player_id, SUM(s.hits) AS hits,\n    ROW_NUMBER() OVER (PARTITION BY s.team_id ORDER BY SUM(s.hits) DESC, s.player_id) AS rn\n  FROM player_game_stats s JOIN games g ON g.game_id = s.game_id\n  WHERE g.game_type = 'regular'\n  GROUP BY s.team_id, s.player_id)\nWHERE rn = 1;",
    hints: ["DENSE_RANK() OVER (PARTITION BY team_id ORDER BY home_runs DESC) <= 2.", "ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY hits DESC, player_id) <= 3."],
    tasks: [
      task("Find each team’s players at the team’s top two distinct home-run totals (including all ties) in the 2025 regular season. Return team_id, player_id and home_runs. Count only players with at least one home run for the team.", `SELECT team_id, player_id, home_runs FROM (SELECT team_id, player_id, home_runs, DENSE_RANK() OVER (PARTITION BY team_id ORDER BY home_runs DESC) AS dr FROM (SELECT s.team_id, s.player_id, SUM(s.home_runs) AS home_runs FROM player_game_stats s ${REGULAR_2025} GROUP BY s.team_id, s.player_id HAVING SUM(s.home_runs) >= 1)) WHERE dr <= 2`),
      task("Find the 2025 regular season. Return team_id, player_id and hits for exactly three players per team: the most hits for that team, ties broken by the smaller player_id.", `SELECT team_id, player_id, hits FROM (SELECT team_id, player_id, hits, ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY hits DESC, player_id) AS rn FROM (SELECT s.team_id, s.player_id, SUM(s.hits) AS hits FROM player_game_stats s ${REGULAR_2025} GROUP BY s.team_id, s.player_id)) WHERE rn <= 3`),
    ],
    quiz: quiz("Three players tie for a team’s second-highest total. With DENSE_RANK <= 2, how many players at that value are kept?", ["One", "All three", "None"], 1, "Tied rows share the dense rank, so all of them pass the filter."),
    walkthrough: [
      step("Pick one hits leader per team", "Run this. After summing hits by player, ROW_NUMBER() = 1 keeps a single top hitter per team, breaking ties with the smaller player_id.", "SELECT team_id, player_id, hits FROM (SELECT s.team_id, s.player_id, SUM(s.hits) AS hits, ROW_NUMBER() OVER (PARTITION BY s.team_id ORDER BY SUM(s.hits) DESC, s.player_id) AS rn FROM player_game_stats s JOIN games g ON g.game_id = s.game_id WHERE g.game_type = 'regular' GROUP BY s.team_id, s.player_id) WHERE rn = 1;"),
      step("Find tied home-run totals", "Run this. Groups with more than one player show why DENSE_RANK keeps every tied name when you ask for “top two totals.”", `SELECT team_id, home_runs, COUNT(*) AS players FROM (SELECT s.team_id, s.player_id, SUM(s.home_runs) AS home_runs FROM player_game_stats s ${REGULAR_2025} GROUP BY s.team_id, s.player_id) WHERE home_runs > 15 GROUP BY team_id, home_runs HAVING COUNT(*) > 1;`),
    ],
  },
  57: {
    dataset: "sports", decision: "MIGRATE", reason: "NTILE over real 2025 batting averages for qualified hitters.",
    concept: "NTILE(n) splits the ordered rows of a window into n buckets of as equal size as possible and returns each row’s bucket number. Use it for quartiles or deciles of a population, ordering by the measure and a tie-breaker.",
    trap: "NTILE balances counts, not values: tied batting averages can land in different quartiles, so a deterministic tie-breaker matters.",
    grain: "One row per qualified hitter.",
    example: "SELECT team_id, wins,\n  NTILE(3) OVER (ORDER BY wins DESC, team_id) AS tier\nFROM standings\nWHERE season = 2025 AND as_of_date = (SELECT last_regular_date FROM seasons WHERE season = 2025);",
    hints: ["Compute batting_avg = ROUND(1.0 * hits / at_bats, 3) per player first.", "NTILE(4) OVER (PARTITION BY league ORDER BY batting_avg DESC, player_id)."],
    tasks: [
      task("Find players with at least 400 plate appearances in the 2025 regular season. Return player_id, batting_avg (hits ÷ at bats, rounded to 3 decimals) and quartile: NTILE(4) ordered by batting_avg descending, then player_id.", `SELECT player_id, batting_avg, NTILE(4) OVER (ORDER BY batting_avg DESC, player_id) AS quartile FROM (SELECT s.player_id, ROUND(1.0 * SUM(s.hits) / SUM(s.at_bats), 3) AS batting_avg FROM player_game_stats s ${REGULAR_2025} GROUP BY s.player_id HAVING SUM(s.plate_appearances) >= 400)`),
      task("Find players with at least 400 plate appearances for a single team in the 2025 regular season. Return league (from teams), player_id, batting_avg and league_quartile: NTILE(4) within the league, ordered by batting_avg descending, then player_id.", `SELECT t.league, x.player_id, x.batting_avg, NTILE(4) OVER (PARTITION BY t.league ORDER BY x.batting_avg DESC, x.player_id) AS league_quartile FROM (SELECT s.team_id, s.player_id, ROUND(1.0 * SUM(s.hits) / SUM(s.at_bats), 3) AS batting_avg FROM player_game_stats s ${REGULAR_2025} GROUP BY s.team_id, s.player_id HAVING SUM(s.plate_appearances) >= 400) x JOIN teams t ON t.team_id = x.team_id`),
    ],
    quiz: quiz("NTILE(4) over 10 rows produces buckets of sizes…", ["3, 3, 2, 2", "2, 2, 3, 3", "Exactly 2.5"], 0, "Extra rows go to the earliest buckets."),
    walkthrough: [
      step("Split teams into three buckets", "Run this. NTILE(3) sorts teams by wins and labels each with tier 1, 2, or 3—roughly equal-sized groups for comparing standings.", "SELECT team_id, wins, NTILE(3) OVER (ORDER BY wins DESC, team_id) AS tier FROM standings WHERE season = 2025 AND as_of_date = (SELECT last_regular_date FROM seasons WHERE season = 2025);"),
      step("Preview qualified batting averages", "Run this. Only players with at least 400 plate appearances appear—the pool you will quartile in the tasks.", `SELECT s.player_id, SUM(s.plate_appearances) AS pa, ROUND(1.0 * SUM(s.hits) / SUM(s.at_bats), 3) AS batting_avg FROM player_game_stats s ${REGULAR_2025} GROUP BY s.player_id HAVING SUM(s.plate_appearances) >= 400 ORDER BY batting_avg DESC LIMIT 10;`),
    ],
  },
};
