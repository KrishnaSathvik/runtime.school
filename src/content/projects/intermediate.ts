import { defineProject } from "./helpers";

export const healthcareOperations = defineProject({
  id: "healthcare-operations",
  title: "Healthcare Operations",
  level: "intermediate",
  role: "Clinic Operations Analyst",
  datasetId: "healthcare",
  brief: {
    who: "You support the operations director of a regional clinic network.",
    situation: "Missed appointments waste clinician time, and the finance team is worried about unpaid costs and repeat emergency visits. The director wants evidence before funding a reminder service and a care-coordination pilot.",
    ask: "How many booked appointments are missed, where are no-shows highest, who pays for care, and how often do emergency patients come back within 30 days?",
    data: "Healthcare: three years (July 2022–June 2025) of synthetic patient journeys: patients, clinicians, appointments, encounters, diagnoses, prescriptions, observations and procedures. No real patient data.",
    deliverable: "An operations brief with three findings and one funding recommendation.",
  },
  prerequisites: ["Joins", "Aggregation", "CASE expressions", "Window functions (LEAD)", "Date arithmetic"],
  placementAfter: ["window functions", "dates"],
  relevantTables: ["appointments", "providers", "encounters", "patients"],
  understand: {
    title: "Understand appointments and encounters",
    context: "appointments has one row per booked slot, with status completed, cancelled, no_show or scheduled (still in the future). A completed appointment links to the encounter it produced. encounters has one row per visit of any kind, including walk-in emergency visits with no appointment; encounter_class names the kind. total_cost is the billed cost and payer_paid what the insurer paid. patients.insurance_type is commercial, medicaid, medicare or self_pay.",
    investigation: "Follow a completed appointment to its encounter. Which encounters have no appointment at all?",
  },
  steps: [
    {
      kind: "checkpoint", id: "appointment-outcomes", title: "Measure appointment outcomes",
      context: "Start with the whole booking book: how often booked slots are kept, cancelled or missed.",
      investigation: "How many appointments end in each status, and what share of all bookings is each?",
      tables: ["appointments"],
      columns: ["status", "appointments", "share_pct"],
      grain: "one row per status, most frequent first", ordered: true,
      definitions: ["share_pct = 100 × appointments / all appointments, 2 decimals. Order by appointments descending, then status."],
      hints: ["Group by status.", "A scalar subquery gives the total for the share.", "Use 100.0 to keep decimals."],
      finding: "What share of bookings are no-shows, and how does that compare with cancellations?",
      sql: `
SELECT status,
       COUNT(*) AS appointments,
       ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM appointments), 2) AS share_pct
FROM appointments
GROUP BY status
ORDER BY appointments DESC, status`,
    },
    {
      kind: "checkpoint", id: "no-shows", title: "Find where no-shows concentrate",
      context: "A reminder service should start where no-shows are most common. Exclude future appointments, which have no outcome yet, and small specialties.",
      investigation: "For specialties with at least 200 past appointments, what is the no-show rate?",
      tables: ["appointments", "providers"],
      columns: ["specialty", "past_appointments", "no_shows", "no_show_pct"],
      grain: "one row per specialty, highest rate first", ordered: true,
      definitions: [
        "Past appointments: status other than 'scheduled'. specialty = providers.specialty of the booked clinician.",
        "Keep specialties with at least 200 past appointments. no_show_pct = 100 × no_shows / past_appointments, 2 decimals. Order by no_show_pct descending, then specialty.",
      ],
      hints: ["Join appointments to providers.", "Filter scheduled rows in WHERE, small groups in HAVING.", "SUM(status = 'no_show') counts no-shows."],
      finding: "How much do no-show rates vary across specialties? Is the variation large enough to target one specialty, or is it network-wide?",
      sql: `
SELECT p.specialty,
       COUNT(*) AS past_appointments,
       SUM(a.status = 'no_show') AS no_shows,
       ROUND(100.0 * SUM(a.status = 'no_show') / COUNT(*), 2) AS no_show_pct
FROM appointments AS a
JOIN providers AS p ON p.provider_id = a.provider_id
WHERE a.status <> 'scheduled'
GROUP BY p.specialty
HAVING COUNT(*) >= 200
ORDER BY no_show_pct DESC, p.specialty`,
    },
    {
      kind: "checkpoint", id: "payer-mix", title: "Check who pays for care",
      context: "Finance needs to know how much billed cost insurers cover for each kind of coverage.",
      investigation: "For each insurance type, how many encounters were there, what was the average cost, and what share of billed cost did payers cover?",
      tables: ["encounters", "patients"],
      columns: ["insurance_type", "encounters", "avg_cost", "payer_paid_pct"],
      grain: "one row per insurance type, highest coverage first", ordered: true,
      definitions: ["avg_cost = average total_cost, 2 decimals. payer_paid_pct = 100 × sum of payer_paid / sum of total_cost, 1 decimal. Order by payer_paid_pct descending, then insurance_type."],
      hints: ["Join encounters to patients for insurance_type.", "Divide the sums, not the average of per-visit ratios.", "Self-pay patients have no insurer."],
      finding: "How much of billed cost goes unpaid for self-pay patients, and which coverage pays the highest share?",
      sql: `
SELECT p.insurance_type,
       COUNT(*) AS encounters,
       ROUND(AVG(e.total_cost), 2) AS avg_cost,
       ROUND(100.0 * SUM(e.payer_paid) / SUM(e.total_cost), 1) AS payer_paid_pct
FROM encounters AS e
JOIN patients AS p ON p.patient_id = e.patient_id
GROUP BY p.insurance_type
ORDER BY payer_paid_pct DESC, p.insurance_type`,
    },
    {
      kind: "checkpoint", id: "emergency-returns", title: "Measure 30-day emergency returns",
      context: "A care-coordination pilot is meant to reduce repeat emergency visits. Measure how often an emergency visit is followed by another within 30 days.",
      investigation: "How many patients had an emergency visit, how many emergency visits were there, and how many were followed by the same patient's next emergency visit within 30 days?",
      tables: ["encounters"],
      columns: ["emergency_patients", "emergency_visits", "returns_within_30d", "return_rate_pct"],
      grain: "one summary row", ordered: false,
      definitions: [
        "Use encounters with encounter_class = 'emergency'. For each visit, the next emergency visit is the following one for the same patient by start_at (then encounter_id).",
        "A return: the next visit starts within 30 days (julianday difference <= 30). return_rate_pct = 100 × returns / emergency visits, 2 decimals.",
      ],
      hints: ["LEAD(start_at) OVER (PARTITION BY patient_id ORDER BY start_at, encounter_id) gives each visit's next visit.", "Compute LEAD in a CTE, then aggregate.", "The last visit of each patient has no next visit."],
      finding: "How common are 30-day emergency returns? Would a pilot aimed at them reach many patients?",
      sql: `
WITH emergency AS (
  SELECT patient_id, start_at,
         LEAD(start_at) OVER (PARTITION BY patient_id ORDER BY start_at, encounter_id) AS next_visit_at
  FROM encounters
  WHERE encounter_class = 'emergency'
)
SELECT COUNT(DISTINCT patient_id) AS emergency_patients,
       COUNT(*) AS emergency_visits,
       SUM(next_visit_at IS NOT NULL AND julianday(next_visit_at) - julianday(start_at) <= 30) AS returns_within_30d,
       ROUND(100.0 * SUM(next_visit_at IS NOT NULL AND julianday(next_visit_at) - julianday(start_at) <= 30) / COUNT(*), 2) AS return_rate_pct
FROM emergency`,
    },
  ],
  synthesis: {
    title: "Review the operational picture",
    investigation: "Connect appointment outcomes, no-show variation, payer coverage and emergency returns.",
    reviewPrompt: "Which investment has the stronger evidence: a reminder service or care coordination? What would you need to know before funding either?",
  },
  report: {
    context: "The operations director will decide between two funding requests.",
    investigation: "Deliver three findings and one funding recommendation.",
    summary: "Summarize no-shows, payer coverage and emergency returns, with rates.",
    recommendation: "Recommend which program to fund first and what to measure.",
    limitations: "Explain the limits: synthetic data, appointments do not record why patients missed them, and returns to other hospitals are not visible.",
  },
});

export const gridDemandGeneration = defineProject({
  id: "grid-demand-generation",
  title: "Grid Demand & Generation",
  level: "intermediate",
  role: "Energy Market Analyst",
  datasetId: "energy",
  brief: {
    who: "You support a utility's resource-planning team.",
    situation: "Planners rely on day-ahead demand forecasts and on neighbours for imports during peaks. They want evidence on forecast quality, when each region peaks, how much generation is renewable, and which regions depend on imports.",
    ask: "How accurate are demand forecasts, when do regions peak, how renewable is generation, and which regions rely on imports?",
    data: "Energy: hourly electricity demand, day-ahead forecasts, generation and interchange for twelve U.S. balancing authorities, January–June 2024 (EIA-930), with daily generation by fuel.",
    deliverable: "A planning brief with three findings and one recommendation.",
  },
  prerequisites: ["Aggregation", "Joins", "Window functions (ROW_NUMBER)", "Ratios"],
  placementAfter: ["window functions"],
  relevantTables: ["hourly_demand", "generation", "generation_by_fuel", "fuel_types", "balancing_authorities"],
  understand: {
    title: "Understand the grid data",
    context: "A balancing authority (ba_code) keeps supply and demand balanced in its area. hourly_demand has one row per authority and hour: demand_mw is reported demand and forecast_mw the day-ahead forecast; hour_number is the local hour ending (1–24). generation has one row per authority and hour; total_interchange_mw is negative when the authority imports more than it exports. generation_by_fuel sums each day's generation by fuel, and fuel_types says which fuels are renewable.",
    investigation: "Compare one authority's demand and forecast for one day. Which hours were furthest off?",
  },
  steps: [
    {
      kind: "checkpoint", id: "forecast-error", title: "Measure forecast accuracy",
      context: "Planners schedule generation on the day-ahead forecast. Mean absolute percentage error (MAPE) shows how far off it typically is.",
      investigation: "For each balancing authority, over hours with both demand and forecast, what is the mean absolute percentage error of the forecast?",
      tables: ["hourly_demand"],
      columns: ["ba_code", "hours", "mape_pct"],
      grain: "one row per authority, worst forecast first", ordered: true,
      definitions: [
        "Use hours with demand_mw > 0 and a non-NULL forecast_mw.",
        "mape_pct = 100 × average of |demand_mw − forecast_mw| / demand_mw, 2 decimals. Order by mape_pct descending, then ba_code.",
      ],
      hints: ["ABS() gives the absolute error.", "Multiply by 1.0 before dividing integers.", "Average the per-hour percentage errors."],
      finding: "Which authority's forecast is far worse than the rest? Is that a planning problem or a data problem you should check first?",
      sql: `
SELECT ba_code,
       COUNT(*) AS hours,
       ROUND(100.0 * AVG(ABS(demand_mw - forecast_mw) * 1.0 / demand_mw), 2) AS mape_pct
FROM hourly_demand
WHERE demand_mw > 0 AND forecast_mw IS NOT NULL
GROUP BY ba_code
ORDER BY mape_pct DESC, ba_code`,
    },
    {
      kind: "checkpoint", id: "peaks", title: "Find each region's peak hour",
      context: "Capacity is sized for the single highest hour. Find when each authority hit its peak.",
      investigation: "For each authority, what was its highest hourly demand from January to June, and on which local date and hour did it occur?",
      tables: ["hourly_demand"],
      columns: ["ba_code", "peak_mw", "peak_date", "peak_hour"],
      grain: "one row per authority, largest peak first", ordered: true,
      definitions: [
        "peak_date = local_date and peak_hour = hour_number of the highest demand_mw. If two hours tie, take the earlier hour_ending_utc.",
        "Order by peak_mw descending.",
      ],
      hints: ["ROW_NUMBER() OVER (PARTITION BY ba_code ORDER BY demand_mw DESC, hour_ending_utc) ranks each authority's hours.", "Keep rank 1 in an outer query.", "Ignore hours with NULL demand."],
      finding: "Which authorities peak in summer and which in winter? What does that mean for maintenance scheduling?",
      sql: `
WITH ranked AS (
  SELECT ba_code, local_date, hour_number, demand_mw,
         ROW_NUMBER() OVER (PARTITION BY ba_code ORDER BY demand_mw DESC, hour_ending_utc) AS rn
  FROM hourly_demand
  WHERE demand_mw IS NOT NULL
)
SELECT ba_code, demand_mw AS peak_mw, local_date AS peak_date, hour_number AS peak_hour
FROM ranked
WHERE rn = 1
ORDER BY peak_mw DESC`,
    },
    {
      kind: "checkpoint", id: "renewables", title: "Track the renewable share",
      context: "Planners need to know how much generation comes from renewables and how it moves through the year.",
      investigation: "For each month, how much electricity was generated in total and from renewable fuels, and what was the renewable share?",
      tables: ["generation_by_fuel", "fuel_types"],
      columns: ["month", "generation_mwh", "renewable_mwh", "renewable_pct"],
      grain: "one row per month, in order", ordered: true,
      definitions: [
        "month = first 7 characters of generation_by_fuel.date. Renewable fuels have fuel_types.is_renewable = 1.",
        "renewable_pct = 100 × renewable_mwh / generation_mwh, 1 decimal.",
      ],
      hints: ["Join generation_by_fuel to fuel_types on fuel_code.", "SUM a CASE for the renewable part.", "Order by month."],
      finding: "When is the renewable share highest, and why might spring differ from winter and summer?",
      sql: `
SELECT substr(g.date, 1, 7) AS month,
       SUM(g.generation_mwh) AS generation_mwh,
       SUM(CASE WHEN f.is_renewable = 1 THEN g.generation_mwh ELSE 0 END) AS renewable_mwh,
       ROUND(100.0 * SUM(CASE WHEN f.is_renewable = 1 THEN g.generation_mwh ELSE 0 END) / SUM(g.generation_mwh), 1) AS renewable_pct
FROM generation_by_fuel AS g
JOIN fuel_types AS f ON f.fuel_code = g.fuel_code
GROUP BY month
ORDER BY month`,
    },
    {
      kind: "checkpoint", id: "imports", title: "Identify import-dependent regions",
      context: "An authority that imports most hours depends on its neighbours during peaks.",
      investigation: "For each authority, in how many reported hours was total interchange negative (net imports), and what share of hours is that?",
      tables: ["generation"],
      columns: ["ba_code", "hours", "import_hours", "import_hours_pct"],
      grain: "one row per authority, most import-dependent first", ordered: true,
      definitions: [
        "hours = hours with a non-NULL total_interchange_mw. import hour: total_interchange_mw < 0.",
        "import_hours_pct = 100 × import_hours / hours, 1 decimal. Order by import_hours_pct descending, then ba_code.",
      ],
      hints: ["COUNT(total_interchange_mw) counts reported hours.", "SUM(total_interchange_mw < 0) counts import hours.", "Group by ba_code."],
      finding: "Which authorities import almost every hour? How should that affect peak planning?",
      sql: `
SELECT ba_code,
       COUNT(total_interchange_mw) AS hours,
       SUM(total_interchange_mw < 0) AS import_hours,
       ROUND(100.0 * SUM(total_interchange_mw < 0) / COUNT(total_interchange_mw), 1) AS import_hours_pct
FROM generation
GROUP BY ba_code
ORDER BY import_hours_pct DESC, ba_code`,
    },
  ],
  synthesis: {
    title: "Review the planning picture",
    investigation: "Connect forecast accuracy, peak timing, renewable share and import dependence.",
    reviewPrompt: "Which authority carries the most planning risk once you combine forecast error, peaks and import dependence? What would you verify before acting?",
  },
  report: {
    context: "The resource-planning team will use this to prioritize next quarter's work.",
    investigation: "Deliver three findings and one recommendation.",
    summary: "Summarize forecast accuracy, peaks, renewables and imports with numbers.",
    recommendation: "Recommend one planning priority and the evidence behind it.",
    limitations: "Explain the limits: six months of one year, imputed hours in the source, and that interchange shows net flows, not the reason for them.",
  },
});

export const engineeringDeliveryPerformance = defineProject({
  id: "engineering-delivery-performance",
  title: "Engineering Delivery Performance",
  level: "intermediate",
  role: "Engineering Analytics Lead",
  datasetId: "developer",
  brief: {
    who: "You support the VP of Engineering at a code-hosting platform.",
    situation: "Leadership wants to know how healthy the delivery process is: how much work gets merged, how long reviews take, whether code is merged without review, and how often production deploys fail.",
    ask: "How quickly does work get merged, is it reviewed, and how reliable are production deployments?",
    data: "Developer Platform: eighteen months (January 2024–June 2025) of a fictional code-hosting platform: organizations, teams, developers, repositories, pull requests, reviews, commits, deployments and incidents.",
    deliverable: "A delivery-health review with three findings and one recommendation.",
  },
  prerequisites: ["Joins", "Aggregation", "EXISTS / NOT EXISTS", "Date arithmetic"],
  placementAfter: ["subqueries", "dates"],
  relevantTables: ["pull_requests", "repositories", "reviews", "deployments"],
  understand: {
    title: "Understand the delivery data",
    context: "pull_requests has one row per pull request with state merged, closed or open; merged_at is set only for merged ones. Each belongs to a repository, which has a primary_language. reviews has one row per submitted review (approved, commented or changes_requested); a pull request can have none. deployments has one row per deployment of a commit to staging or production, with status success, failed or rolled_back.",
    investigation: "Pick a merged pull request and list its reviews. Can you find one merged with no review at all?",
  },
  steps: [
    {
      kind: "checkpoint", id: "pr-outcomes", title: "Measure pull request outcomes",
      context: "Start with how much proposed work is merged, abandoned or still open.",
      investigation: "How many pull requests ended in each state, and what share of all pull requests is each?",
      tables: ["pull_requests"],
      columns: ["state", "pull_requests", "share_pct"],
      grain: "one row per state, most frequent first", ordered: true,
      definitions: ["share_pct = 100 × pull_requests / all pull requests, 1 decimal. Order by pull_requests descending."],
      hints: ["Group by state.", "Use a scalar subquery for the total.", "Use 100.0."],
      finding: "What share of pull requests is closed without merging? What might that say about wasted effort?",
      sql: `
SELECT state,
       COUNT(*) AS pull_requests,
       ROUND(100.0 * COUNT(*) / (SELECT COUNT(*) FROM pull_requests), 1) AS share_pct
FROM pull_requests
GROUP BY state
ORDER BY pull_requests DESC`,
    },
    {
      kind: "checkpoint", id: "cycle-time", title: "Compare time to merge by language",
      context: "Long waits to merge slow every team. Compare languages with enough volume to be meaningful.",
      investigation: "For languages with at least 100 merged pull requests, how many were merged and what was the average time from opening to merge in hours?",
      tables: ["pull_requests", "repositories"],
      columns: ["primary_language", "merged_prs", "avg_hours_to_merge"],
      grain: "one row per language, slowest first", ordered: true,
      definitions: [
        "Merged pull requests have a non-NULL merged_at. Hours to merge = (julianday(merged_at) − julianday(created_at)) × 24.",
        "avg_hours_to_merge to 1 decimal. Keep languages with at least 100 merged. Order by avg_hours_to_merge descending, then primary_language.",
      ],
      hints: ["Join pull_requests to repositories for primary_language.", "julianday differences are in days.", "HAVING COUNT(*) >= 100."],
      finding: "How large is the gap between the slowest and fastest language? Is it big enough to act on?",
      sql: `
SELECT r.primary_language,
       COUNT(*) AS merged_prs,
       ROUND(AVG((julianday(pr.merged_at) - julianday(pr.created_at)) * 24), 1) AS avg_hours_to_merge
FROM pull_requests AS pr
JOIN repositories AS r ON r.repository_id = pr.repository_id
WHERE pr.merged_at IS NOT NULL
GROUP BY r.primary_language
HAVING COUNT(*) >= 100
ORDER BY avg_hours_to_merge DESC, r.primary_language`,
    },
    {
      kind: "checkpoint", id: "review-coverage", title: "Check review coverage",
      context: "Code merged without review is a quality and security risk.",
      investigation: "How many merged pull requests had no review at all, and how many had no approving review?",
      tables: ["pull_requests", "reviews"],
      columns: ["merged_prs", "merged_without_review", "merged_without_approval", "without_approval_pct"],
      grain: "one summary row", ordered: false,
      definitions: [
        "merged_without_review: no row in reviews for the pull request. merged_without_approval: no review with state 'approved'.",
        "without_approval_pct = 100 × merged_without_approval / merged_prs, 1 decimal.",
      ],
      hints: ["NOT EXISTS (SELECT 1 FROM reviews …) tests for a missing review.", "Add AND state = 'approved' for the second test.", "A comparison sums as 1 or 0."],
      finding: "What share of merged work was never approved? Who should own fixing that?",
      sql: `
SELECT COUNT(*) AS merged_prs,
       SUM(NOT EXISTS (SELECT 1 FROM reviews AS rv WHERE rv.pull_request_id = pr.pull_request_id)) AS merged_without_review,
       SUM(NOT EXISTS (SELECT 1 FROM reviews AS rv WHERE rv.pull_request_id = pr.pull_request_id AND rv.state = 'approved')) AS merged_without_approval,
       ROUND(100.0 * SUM(NOT EXISTS (SELECT 1 FROM reviews AS rv WHERE rv.pull_request_id = pr.pull_request_id AND rv.state = 'approved')) / COUNT(*), 1) AS without_approval_pct
FROM pull_requests AS pr
WHERE pr.merged_at IS NOT NULL`,
    },
    {
      kind: "checkpoint", id: "change-failure", title: "Track production change failure",
      context: "Change failure rate is the share of production deployments that fail or are rolled back.",
      investigation: "For each month, how many production deployments were there, how many failed or were rolled back, and what was the change failure rate?",
      tables: ["deployments"],
      columns: ["month", "production_deploys", "failed_or_rolled_back", "change_failure_pct"],
      grain: "one row per month, in order", ordered: true,
      definitions: [
        "Production only (environment = 'production'). month = first 7 characters of started_at. A failure is any status other than 'success'.",
        "change_failure_pct = 100 × failures / production deploys, 1 decimal.",
      ],
      hints: ["Filter environment in WHERE.", "SUM(status <> 'success') counts failures.", "Order by month."],
      finding: "Is the change failure rate stable, improving or getting worse? Which months stand out?",
      sql: `
SELECT substr(started_at, 1, 7) AS month,
       COUNT(*) AS production_deploys,
       SUM(status <> 'success') AS failed_or_rolled_back,
       ROUND(100.0 * SUM(status <> 'success') / COUNT(*), 1) AS change_failure_pct
FROM deployments
WHERE environment = 'production'
GROUP BY month
ORDER BY month`,
    },
  ],
  synthesis: {
    title: "Review delivery health",
    investigation: "Connect outcomes, time to merge, review coverage and change failure.",
    reviewPrompt: "Which single process change would most improve delivery health? What evidence supports it, and what would you watch for?",
  },
  report: {
    context: "The VP of Engineering will pick one process change for next quarter.",
    investigation: "Deliver three findings and one recommendation.",
    summary: "Summarize merge outcomes, speed, review coverage and change failure with numbers.",
    recommendation: "Recommend one process change and how you would measure it.",
    limitations: "Explain the limits: synthetic data, averages hide long waits, and a review record does not show review quality.",
  },
});

export const coldChainMonitoring = defineProject({
  id: "cold-chain-monitoring",
  title: "Cold Chain Monitoring Review",
  level: "intermediate",
  role: "Facilities Reliability Analyst",
  datasetId: "iot",
  brief: {
    who: "You support the reliability team for eight facilities monitored by sensors.",
    situation: "Freezers, cold rooms and production lines report readings every few minutes. Alerts are noisy and maintenance is expensive. The team wants to know whether the telemetry can be trusted, which sensors raise the most alerts, which sites spend longest in alert, and where maintenance money goes.",
    ask: "Can the sensor data be trusted, which sensors and sites drive alerts, and where does maintenance spending go?",
    data: "IoT / Sensors: two months (March–April 2025) of telemetry from sensors across eight fictional facilities, with devices, sensor types, alerts, maintenance work orders and device status changes.",
    deliverable: "A reliability review with three findings and one recommendation.",
  },
  prerequisites: ["Aggregation", "Joins", "Deduplication", "Date arithmetic"],
  placementAfter: ["joins", "dates"],
  relevantTables: ["sensor_readings", "devices", "sensor_types", "locations", "alerts", "maintenance"],
  understand: {
    title: "Understand the telemetry",
    context: "sensor_readings has one row per reading as received. When a gateway retransmits, the same device_id, recorded_at and sequence_number arrive again with a new reading_id. quality_flag marks 'fault' and 'out_of_range' readings. devices link to sensor_types (what is measured) and locations (site and zone). alerts has one row per alert interval from opened_at to closed_at. maintenance has one row per work order with its cost.",
    investigation: "Find a retransmitted reading. Which columns repeat and which change?",
  },
  steps: [
    {
      kind: "checkpoint", id: "data-quality", title: "Check whether the telemetry can be trusted",
      context: "Retransmissions inflate counts, and an alert that closes before it opens corrupts any duration. Count both before analysing.",
      investigation: "How many readings were received, how many unique readings and retransmissions are there, how many readings are flagged, and how many alerts close before they open?",
      tables: ["sensor_readings", "alerts"],
      columns: ["received", "unique_readings", "retransmissions", "fault_flags", "out_of_range_flags", "alerts_closed_before_opened"],
      grain: "one summary row", ordered: false,
      definitions: [
        "A unique reading is one (device_id, recorded_at, sequence_number). retransmissions = received − unique_readings.",
        "fault_flags / out_of_range_flags count received rows with that quality_flag. alerts_closed_before_opened: closed_at < opened_at.",
      ],
      hints: ["Count unique readings in a CTE with GROUP BY on the three columns.", "Scalar subqueries let one row combine several tables.", "Compare the alert timestamps as text."],
      finding: "How much would raw counts overstate the data? Which alerts can you not use for durations?",
      sql: `
WITH unique_readings AS (
  SELECT device_id, recorded_at, sequence_number
  FROM sensor_readings
  GROUP BY device_id, recorded_at, sequence_number
)
SELECT (SELECT COUNT(*) FROM sensor_readings) AS received,
       (SELECT COUNT(*) FROM unique_readings) AS unique_readings,
       (SELECT COUNT(*) FROM sensor_readings) - (SELECT COUNT(*) FROM unique_readings) AS retransmissions,
       (SELECT COUNT(*) FROM sensor_readings WHERE quality_flag = 'fault') AS fault_flags,
       (SELECT COUNT(*) FROM sensor_readings WHERE quality_flag = 'out_of_range') AS out_of_range_flags,
       (SELECT COUNT(*) FROM alerts WHERE closed_at < opened_at) AS alerts_closed_before_opened`,
    },
    {
      kind: "checkpoint", id: "alerts-by-sensor", title: "Find the noisiest sensors",
      context: "Use only alerts with a valid interval, so impossible durations do not distort the averages.",
      investigation: "For each sensor type, how many valid alerts were raised, how many were critical, and how long did they stay open on average?",
      tables: ["alerts", "devices", "sensor_types"],
      columns: ["type_name", "alerts", "critical", "avg_minutes_open"],
      grain: "one row per sensor type, most alerts first", ordered: true,
      definitions: [
        "Valid alerts: closed_at >= opened_at. Minutes open = (julianday(closed_at) − julianday(opened_at)) × 1440.",
        "avg_minutes_open to 1 decimal. Order by alerts descending, then type_name.",
      ],
      hints: ["Join alerts → devices → sensor_types.", "SUM(severity = 'critical') counts critical alerts.", "Filter invalid intervals in WHERE."],
      finding: "Which sensor types raise the most alerts, and which stay in alert longest? Are they the same?",
      sql: `
SELECT t.type_name,
       COUNT(*) AS alerts,
       SUM(a.severity = 'critical') AS critical,
       ROUND(AVG((julianday(a.closed_at) - julianday(a.opened_at)) * 1440), 1) AS avg_minutes_open
FROM alerts AS a
JOIN devices AS d ON d.device_id = a.device_id
JOIN sensor_types AS t ON t.sensor_type_id = d.sensor_type_id
WHERE a.closed_at >= a.opened_at
GROUP BY t.type_name
ORDER BY alerts DESC, t.type_name`,
    },
    {
      kind: "checkpoint", id: "alerts-by-site", title: "Rank sites by time in alert",
      context: "Total hours in alert measures operational exposure better than the alert count.",
      investigation: "For each site, how many valid alerts were raised and how many hours were spent in alert in total?",
      tables: ["alerts", "devices", "locations"],
      columns: ["site_name", "alerts", "alert_hours"],
      grain: "one row per site, most hours first", ordered: true,
      definitions: ["Valid alerts only. alert_hours = sum of (julianday(closed_at) − julianday(opened_at)) × 24, 1 decimal. Order by alert_hours descending, then site_name."],
      hints: ["Join alerts → devices → locations.", "Sum durations, then round.", "Keep the valid-interval filter."],
      finding: "Which site spends the most time in alert? Does it also raise the most alerts?",
      sql: `
SELECT l.site_name,
       COUNT(*) AS alerts,
       ROUND(SUM((julianday(a.closed_at) - julianday(a.opened_at)) * 24), 1) AS alert_hours
FROM alerts AS a
JOIN devices AS d ON d.device_id = a.device_id
JOIN locations AS l ON l.location_id = d.location_id
WHERE a.closed_at >= a.opened_at
GROUP BY l.site_name
ORDER BY alert_hours DESC, l.site_name`,
    },
    {
      kind: "checkpoint", id: "maintenance", title: "See where maintenance money goes",
      context: "Repairs are expensive; calibration is cheap. Compare spending by type of work.",
      investigation: "For each maintenance type, how many work orders were there, what did they cost in total, and what is the average cost per order?",
      tables: ["maintenance"],
      columns: ["maintenance_type", "work_orders", "total_cost", "avg_cost"],
      grain: "one row per maintenance type, highest total first", ordered: true,
      definitions: ["total_cost and avg_cost to 2 decimals. Order by total_cost descending."],
      hints: ["Group by maintenance_type.", "SUM and AVG over cost.", "Round after aggregating."],
      finding: "What share of spend goes to repairs? Would better monitoring plausibly reduce it?",
      sql: `
SELECT maintenance_type,
       COUNT(*) AS work_orders,
       ROUND(SUM(cost), 2) AS total_cost,
       ROUND(AVG(cost), 2) AS avg_cost
FROM maintenance
GROUP BY maintenance_type
ORDER BY total_cost DESC`,
    },
  ],
  synthesis: {
    title: "Review reliability",
    investigation: "Connect data quality, noisy sensors, site exposure and maintenance spend.",
    reviewPrompt: "Where should the reliability team focus first: data quality, a sensor type, or a site? What evidence supports it?",
  },
  report: {
    context: "The reliability team will choose one focus area for next month.",
    investigation: "Deliver three findings and one recommendation.",
    summary: "Summarize trust in the data, the noisiest sensors and the most exposed site, with numbers.",
    recommendation: "Recommend one focus area and how you would measure improvement.",
    limitations: "Explain the limits: two months of synthetic data, invalid alert intervals, and that an alert does not prove product damage.",
  },
});

export const intermediateCatalog = [healthcareOperations, gridDemandGeneration, engineeringDeliveryPerformance, coldChainMonitoring];
