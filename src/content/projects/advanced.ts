import { defineProject } from "./helpers";

export const saasActivationRetention = defineProject({
  id: "saas-activation-retention",
  title: "SaaS Activation & Retention",
  level: "advanced",
  role: "Senior Product Analyst",
  datasetId: "saas",
  brief: {
    who: "You support the growth team of a collaboration product.",
    situation: "Signups keep rising but revenue lags. The team suspects new workspaces do not reach their first meaningful action, users do not come back, and some acquisition channels bring accounts that never pay. The event pipeline also retries and delivers late, so raw counts may mislead.",
    ask: "Can the event data be trusted, how many new workspaces activate, how many users return the next month, and which channels bring paying accounts?",
    data: "Product / SaaS Analytics: eighteen months (January 2024–June 2025) of a fictional collaboration product: workspaces (accounts), users, sessions, raw event deliveries, subscriptions, experiments and billing.",
    deliverable: "A growth diagnosis with three findings and two priority actions.",
  },
  prerequisites: ["CTEs", "Window functions", "Deduplication", "Cohort analysis", "Date arithmetic"],
  placementAfter: ["window functions", "cte"],
  relevantTables: ["events", "accounts", "users", "subscriptions"],
  understand: {
    title: "Understand the event pipeline",
    context: "events has one row per delivery as ingested. A retry repeats event_id with a new delivery_id, and late deliveries arrive long after occurred_at, so counting rows overcounts. accounts are workspaces with an acquisition_channel; users belong to an account. subscriptions has one row per plan interval; the open interval (ended_at NULL) is the current plan, and mrr_cents is its monthly recurring revenue (0 on the free plan).",
    investigation: "Find an event_id delivered more than once. Which columns differ between the copies?",
  },
  steps: [
    {
      kind: "checkpoint", id: "event-quality", title: "Measure retries and late deliveries",
      context: "Every metric downstream depends on counting each logical event once.",
      investigation: "How many deliveries and unique events are there, how many deliveries are retries, and how many arrived more than a day after the event occurred?",
      tables: ["events"],
      columns: ["deliveries", "unique_events", "retried_deliveries", "late_deliveries"],
      grain: "one summary row", ordered: false,
      definitions: ["unique_events = distinct event_id. retried_deliveries = deliveries − unique_events. late_deliveries: julianday(received_at) − julianday(occurred_at) > 1."],
      hints: ["COUNT(DISTINCT event_id) counts logical events.", "SUM of a comparison counts late rows.", "julianday differences are in days."],
      finding: "By how much would raw event counts overstate activity? Why do late deliveries matter for daily dashboards?",
      sql: `
SELECT COUNT(*) AS deliveries,
       COUNT(DISTINCT event_id) AS unique_events,
       COUNT(*) - COUNT(DISTINCT event_id) AS retried_deliveries,
       SUM(julianday(received_at) - julianday(occurred_at) > 1) AS late_deliveries
FROM events`,
    },
    {
      kind: "checkpoint", id: "activation", title: "Measure workspace activation",
      context: "The team defines activation as creating a first report within 14 days of the workspace's creation. Cohorts created in June 2025 do not yet have a full 14 days, so stop at May 2025.",
      investigation: "For each monthly cohort of workspaces created from January 2024 to May 2025, how many activated within 14 days, and what share is that?",
      tables: ["accounts", "events"],
      columns: ["cohort_month", "accounts", "activated", "activation_pct"],
      grain: "one row per cohort month, in order", ordered: true,
      definitions: [
        "cohort_month = strftime('%Y-%m', accounts.created_at), for accounts created from 2024-01-01 up to 2025-06-01.",
        "Activated: the account's earliest 'report_created' event occurred within 14 days of created_at (julianday difference <= 14).",
        "activation_pct = 100 × activated / accounts, 1 decimal.",
      ],
      hints: [
        "MIN(occurred_at) per account is unaffected by retried deliveries.",
        "LEFT JOIN the first-report CTE so accounts without reports stay in the denominator.",
        "Group by cohort month.",
      ],
      finding: "Is activation improving across cohorts or flat? What share of new workspaces never reach a first report in two weeks?",
      sql: `
WITH first_report AS (
  SELECT account_id, MIN(occurred_at) AS first_report_at
  FROM events
  WHERE event_name = 'report_created'
  GROUP BY account_id
)
SELECT strftime('%Y-%m', a.created_at) AS cohort_month,
       COUNT(*) AS accounts,
       SUM(f.first_report_at IS NOT NULL AND julianday(f.first_report_at) - julianday(a.created_at) <= 14) AS activated,
       ROUND(100.0 * SUM(f.first_report_at IS NOT NULL AND julianday(f.first_report_at) - julianday(a.created_at) <= 14) / COUNT(*), 1) AS activation_pct
FROM accounts AS a
LEFT JOIN first_report AS f ON f.account_id = a.account_id
WHERE a.created_at >= '2024-01-01' AND a.created_at < '2025-06-01'
GROUP BY cohort_month
ORDER BY cohort_month`,
    },
    {
      kind: "checkpoint", id: "retention", title: "Measure next-month user retention",
      context: "Activation is the start; the product only grows if users come back.",
      investigation: "For each monthly cohort of users who signed up from January 2024 to May 2025, how many produced any event in the following calendar month?",
      tables: ["users", "events"],
      columns: ["cohort_month", "users", "retained", "retention_pct"],
      grain: "one row per cohort month, in order", ordered: true,
      definitions: [
        "cohort_month = strftime('%Y-%m', users.created_at) for users created from 2024-01-01 up to 2025-06-01.",
        "Retained: the user has at least one event whose occurred_at falls in the calendar month after cohort_month.",
        "retention_pct = 100 × retained / users, 1 decimal.",
      ],
      hints: [
        "Build the set of (user_id, active month) pairs once with DISTINCT: retries then do not matter.",
        "date(created_at, 'start of month', '+1 month') gives the first day of the next month; strftime('%Y-%m', …) turns it into a month label.",
        "LEFT JOIN the activity set on user_id and the next month.",
      ],
      finding: "What share of users come back in their second month? Is that better or worse for later cohorts?",
      sql: `
WITH active AS (
  SELECT DISTINCT user_id, strftime('%Y-%m', occurred_at) AS month
  FROM events
),
cohort AS (
  SELECT user_id,
         strftime('%Y-%m', created_at) AS cohort_month,
         strftime('%Y-%m', date(created_at, 'start of month', '+1 month')) AS next_month
  FROM users
  WHERE created_at >= '2024-01-01' AND created_at < '2025-06-01'
)
SELECT c.cohort_month,
       COUNT(*) AS users,
       COUNT(a.user_id) AS retained,
       ROUND(100.0 * COUNT(a.user_id) / COUNT(*), 1) AS retention_pct
FROM cohort AS c
LEFT JOIN active AS a ON a.user_id = c.user_id AND a.month = c.next_month
GROUP BY c.cohort_month
ORDER BY c.cohort_month`,
    },
    {
      kind: "checkpoint", id: "channels", title: "Compare acquisition channels",
      context: "Marketing spend should follow accounts that pay, not just signups.",
      investigation: "For each acquisition channel, how many workspaces are there, how many are on a paying plan today, and how much monthly recurring revenue do they bring?",
      tables: ["accounts", "subscriptions"],
      columns: ["acquisition_channel", "accounts", "paying_accounts", "paying_pct", "current_mrr"],
      grain: "one row per channel, highest revenue first", ordered: true,
      definitions: [
        "Use each account's open subscription (ended_at IS NULL). Paying: mrr_cents > 0.",
        "paying_pct = 100 × paying / accounts, 1 decimal. current_mrr = sum of mrr_cents / 100, 2 decimals. Order by current_mrr descending.",
      ],
      hints: ["Put ended_at IS NULL in the join condition.", "Every account has exactly one open subscription.", "Convert cents to dollars by dividing by 100.0."],
      finding: "Which channel brings the most revenue, and which converts best? Are they the same channel?",
      sql: `
SELECT a.acquisition_channel,
       COUNT(*) AS accounts,
       SUM(s.mrr_cents > 0) AS paying_accounts,
       ROUND(100.0 * SUM(s.mrr_cents > 0) / COUNT(*), 1) AS paying_pct,
       ROUND(SUM(s.mrr_cents) / 100.0, 2) AS current_mrr
FROM accounts AS a
JOIN subscriptions AS s ON s.account_id = a.account_id AND s.ended_at IS NULL
GROUP BY a.acquisition_channel
ORDER BY current_mrr DESC`,
    },
  ],
  synthesis: {
    title: "Review the growth diagnosis",
    investigation: "Connect event quality, activation, retention and channel revenue.",
    reviewPrompt: "Where is the biggest leak: activation, retention or acquisition mix? Which two actions follow, and what would show they worked?",
  },
  report: {
    context: "The growth team will commit to two actions for next quarter.",
    investigation: "Deliver three findings and two priority actions.",
    summary: "Summarize the activation, retention and channel findings with rates and amounts.",
    recommendation: "Name two priority actions, the evidence behind each, and the metric that would show success.",
    limitations: "Explain the limits: synthetic data, the definition of activation is a choice, recent cohorts have less history, and current MRR is a snapshot.",
  },
});

export const paymentReconciliation = defineProject({
  id: "payment-reconciliation",
  title: "Payment Reconciliation & Account Integrity",
  level: "advanced",
  role: "Payments Operations Analyst",
  datasetId: "payments",
  brief: {
    who: "You support the payments operations team of a retail bank.",
    situation: "Card authorizations, settlements and the account ledger come from three systems. Finance needs assurance that approved payments settle, that settlements reach customers' ledgers, and that network retries did not cause duplicate charges, plus a view of where refunds concentrate.",
    ask: "Do authorizations, settlements and the ledger agree, did retries cause duplicate charges, and where do declines and refunds concentrate?",
    data: "Finance / Payments: six months (January–June 2025) of a fictional bank: customers, accounts, cards, merchants, card authorizations and settlements, refunds, chargebacks and the account ledger (transactions).",
    deliverable: "A reconciliation report with three findings and two priority actions.",
  },
  prerequisites: ["LEFT JOIN anti-joins", "CTEs", "CASE classification", "Aggregation"],
  placementAfter: ["joins", "cte"],
  relevantTables: ["authorizations", "settlements", "transactions", "merchants", "refunds"],
  understand: {
    title: "Understand the payment flow",
    context: "A card payment starts as an authorization. Network retries repeat request_key with a new authorization_id. An approved authorization is later cleared as a settlement, whose amount can differ (tips, fuel pre-authorizations). The settlement posts to the customer's ledger as a transactions row of type 'card_purchase' with the same authorization_id; ledger amounts are negative when money leaves the account. Refunds and chargebacks reference a settlement.",
    investigation: "Follow one request_key through authorizations, settlements and transactions.",
  },
  steps: [
    {
      kind: "checkpoint", id: "authorizations", title: "Count requests, retries and approvals",
      context: "Retries mean authorization rows are not payment requests. Count requests by request_key.",
      investigation: "How many unique payment requests and authorization attempts are there, how many attempts are retries, and what share of requests was approved?",
      tables: ["authorizations"],
      columns: ["requests", "attempts", "retries", "approved_requests", "approval_pct"],
      grain: "one summary row", ordered: false,
      definitions: [
        "A request is one request_key. A request is approved if any of its attempts has status 'approved'.",
        "retries = attempts − requests. approval_pct = 100 × approved_requests / requests, 2 decimals.",
      ],
      hints: ["Aggregate per request_key in a CTE first.", "MAX(status = 'approved') is 1 if any attempt was approved.", "Then sum the per-request results."],
      finding: "What is the approval rate per request? How many retries could have caused a duplicate charge?",
      sql: `
WITH requests AS (
  SELECT request_key, COUNT(*) AS attempts, MAX(status = 'approved') AS approved
  FROM authorizations
  GROUP BY request_key
)
SELECT COUNT(*) AS requests,
       SUM(attempts) AS attempts,
       SUM(attempts) - COUNT(*) AS retries,
       SUM(approved) AS approved_requests,
       ROUND(100.0 * SUM(approved) / COUNT(*), 2) AS approval_pct
FROM requests`,
    },
    {
      kind: "checkpoint", id: "duplicates", title: "Check retries for duplicate charges",
      context: "If a retried request was settled more than once, the customer was charged twice.",
      investigation: "How many requests have more than one approved attempt, and how many requests were settled more than once?",
      tables: ["authorizations", "settlements"],
      columns: ["requests_approved_twice", "requests_settled_twice", "extra_settled_amount"],
      grain: "one summary row", ordered: false,
      definitions: [
        "requests_approved_twice: request_keys with two or more approved attempts.",
        "requests_settled_twice: request_keys with two or more settlements across their attempts. extra_settled_amount = settled amount beyond the largest settlement of each such request, in dollars, 2 decimals (0 when none).",
      ],
      hints: ["Join settlements to authorizations to reach request_key.", "Aggregate per request_key, then count the requests over the threshold.", "COALESCE the sum to 0 when no request qualifies."],
      finding: "Did retries cause duplicate charges? If not, which control prevented them?",
      sql: `
WITH approved AS (
  SELECT request_key FROM authorizations WHERE status = 'approved' GROUP BY request_key HAVING COUNT(*) > 1
),
settled AS (
  SELECT a.request_key, COUNT(*) AS settlements, SUM(s.amount_cents) - MAX(s.amount_cents) AS extra_cents
  FROM settlements AS s
  JOIN authorizations AS a ON a.authorization_id = s.authorization_id
  GROUP BY a.request_key
  HAVING COUNT(*) > 1
)
SELECT (SELECT COUNT(*) FROM approved) AS requests_approved_twice,
       (SELECT COUNT(*) FROM settled) AS requests_settled_twice,
       ROUND(COALESCE((SELECT SUM(extra_cents) FROM settled), 0) / 100.0, 2) AS extra_settled_amount`,
    },
    {
      kind: "checkpoint", id: "settlement", title: "Match approvals to settlements",
      context: "Every approved authorization should eventually settle, possibly for a different amount.",
      investigation: "How do approved authorization attempts split between settled at the authorized amount, settled at a different amount, and not settled?",
      tables: ["authorizations", "settlements"],
      columns: ["outcome", "authorizations", "authorized_amount"],
      grain: "one row per outcome, most frequent first", ordered: true,
      definitions: [
        "Approved attempts only. Compare settlements.amount_cents with the authorized amount in cents: CAST(ROUND(amount × 100) AS INTEGER).",
        "Outcomes: 'not settled', 'settled at authorized amount', 'settled at a different amount'. authorized_amount = sum of amount, 2 decimals.",
      ],
      hints: ["LEFT JOIN settlements on authorization_id so unsettled approvals remain.", "Authorizations are in dollars, settlements in cents.", "Classify with CASE, then group by the label."],
      finding: "How much approved value never settled? Is a different settled amount a problem, or expected for some merchants?",
      sql: `
SELECT CASE
         WHEN s.settlement_id IS NULL THEN 'not settled'
         WHEN s.amount_cents = CAST(ROUND(a.amount * 100) AS INTEGER) THEN 'settled at authorized amount'
         ELSE 'settled at a different amount'
       END AS outcome,
       COUNT(*) AS authorizations,
       ROUND(SUM(a.amount), 2) AS authorized_amount
FROM authorizations AS a
LEFT JOIN settlements AS s ON s.authorization_id = a.authorization_id
WHERE a.status = 'approved'
GROUP BY outcome
ORDER BY authorizations DESC`,
    },
    {
      kind: "checkpoint", id: "ledger", title: "Reconcile settlements to the ledger",
      context: "A settlement that never reaches the customer's ledger means the bank's books and the customer's balance disagree.",
      investigation: "How many settlements have a matching posted card purchase in the ledger, how many are missing one, and how many differ in amount?",
      tables: ["settlements", "transactions"],
      columns: ["outcome", "settlements", "settled_amount"],
      grain: "one row per outcome, most frequent first", ordered: true,
      definitions: [
        "Match on authorization_id to transactions with transaction_type 'card_purchase' and status 'posted'.",
        "Outcomes: 'no ledger entry', 'matched' (−transactions.amount_cents = settlements.amount_cents), 'amount differs'. settled_amount = sum of amount_cents / 100, 2 decimals.",
      ],
      hints: ["Put the type and status filters in the LEFT JOIN condition, not WHERE.", "Ledger amounts are negative for purchases.", "Classify, then group."],
      finding: "How many settlements are missing from customer ledgers, and how much money is that?",
      sql: `
SELECT CASE
         WHEN t.transaction_id IS NULL THEN 'no ledger entry'
         WHEN -t.amount_cents = s.amount_cents THEN 'matched'
         ELSE 'amount differs'
       END AS outcome,
       COUNT(*) AS settlements,
       ROUND(SUM(s.amount_cents) / 100.0, 2) AS settled_amount
FROM settlements AS s
LEFT JOIN transactions AS t
  ON t.authorization_id = s.authorization_id
 AND t.transaction_type = 'card_purchase'
 AND t.status = 'posted'
GROUP BY outcome
ORDER BY settlements DESC`,
    },
    {
      kind: "checkpoint", id: "refunds", title: "Find where refunds concentrate",
      context: "Refunds cost operations time. Compare merchant categories by refund rate, not just volume.",
      investigation: "For each merchant category, how much was settled, how much refunded, and what share of settled value was refunded?",
      tables: ["settlements", "authorizations", "merchants", "refunds"],
      columns: ["category", "settled", "refunded", "refund_pct"],
      grain: "one row per category, highest refund share first", ordered: true,
      definitions: [
        "Reach the merchant through settlements → authorizations → merchants. settled and refunded in dollars, 2 decimals (refunded is 0 when none).",
        "refund_pct = 100 × refunded / settled, 2 decimals. Order by refund_pct descending, then category.",
      ],
      hints: ["Sum refunds per settlement in a CTE first, so a settlement with several refunds is not double counted.", "LEFT JOIN that CTE to settlements.", "COALESCE missing refunds to 0."],
      finding: "Which category refunds the largest share of what it sells? Is that surprising for that kind of merchant?",
      sql: `
WITH refunded AS (
  SELECT settlement_id, SUM(amount_cents) AS refunded_cents FROM refunds GROUP BY settlement_id
)
SELECT m.category,
       ROUND(SUM(s.amount_cents) / 100.0, 2) AS settled,
       ROUND(COALESCE(SUM(r.refunded_cents), 0) / 100.0, 2) AS refunded,
       ROUND(100.0 * COALESCE(SUM(r.refunded_cents), 0) / SUM(s.amount_cents), 2) AS refund_pct
FROM settlements AS s
JOIN authorizations AS a ON a.authorization_id = s.authorization_id
JOIN merchants AS m ON m.merchant_id = a.merchant_id
LEFT JOIN refunded AS r ON r.settlement_id = s.settlement_id
GROUP BY m.category
ORDER BY refund_pct DESC, m.category`,
    },
  ],
  synthesis: {
    title: "Review payment integrity",
    investigation: "Connect retries, settlement matching, ledger reconciliation and refunds.",
    reviewPrompt: "Which gap carries the most financial risk? Separate gaps that are expected (pending settlement, tips) from those that need a fix.",
  },
  report: {
    context: "Finance will assign two fixes to payment operations.",
    investigation: "Deliver three findings and two priority actions.",
    summary: "Summarize request approval, duplicate-charge risk, settlement and ledger gaps with counts and amounts.",
    recommendation: "Name two priority fixes, their owner, and the evidence for each.",
    limitations: "Explain the limits: synthetic data, settlements still pending at the end of June, and that a mismatch shows a gap, not its cause.",
  },
});

const DELIVERED = `
delivered AS (
  SELECT p.shipment_id, MAX(e.event_at) AS delivered_at, COUNT(DISTINCT p.package_id) AS packages
  FROM packages AS p
  JOIN tracking_events AS e ON e.package_id = p.package_id AND e.event_type = 'delivered'
  GROUP BY p.shipment_id
),
complete AS (
  SELECT d.* FROM delivered AS d
  WHERE d.packages = (SELECT COUNT(*) FROM packages AS p WHERE p.shipment_id = d.shipment_id)
)`;

export const deliveryNetworkReliability = defineProject({
  id: "delivery-network-reliability",
  title: "Delivery Network Reliability",
  level: "advanced",
  role: "Logistics Performance Analyst",
  datasetId: "logistics",
  brief: {
    who: "You support the network operations director of a parcel carrier network.",
    situation: "Customers complain that premium services arrive late, and several carriers report hitting their targets. Scans arrive late and out of order, so tracking data needs care before it is trusted.",
    ask: "Can tracking scans be trusted, which services and carriers miss their delivery promises, and where do first delivery attempts fail?",
    data: "Logistics: four months (January–April 2025) of a fictional parcel network: shipments, packages, service levels, carriers, facilities, routes, every tracking scan and every delivery attempt.",
    deliverable: "A reliability report with three findings and two priority actions.",
  },
  prerequisites: ["CTEs", "Correlated subqueries", "Aggregation", "Date handling"],
  placementAfter: ["cte", "subqueries"],
  relevantTables: ["shipments", "packages", "tracking_events", "service_levels", "carriers", "delivery_attempts"],
  understand: {
    title: "Understand shipments and scans",
    context: "A shipment is one customer order sent as one or more packages. tracking_events has one row per scan as ingested: event_at is when it happened, recorded_at when the system received it, and scans can repeat, arrive late or out of order. A package is delivered when it has a 'delivered' scan; a shipment is complete when all its packages are delivered. shipments.promised_delivery_date is the promise for the service level. delivery_attempts has one row per attempt at the door.",
    investigation: "Follow one shipment's packages through their scans. Are the scans in the order they were recorded?",
  },
  steps: [
    {
      kind: "checkpoint", id: "scan-quality", title: "Check tracking scan quality",
      context: "Late and out-of-order scans affect any timing metric. Measure them first.",
      investigation: "How many scans are there, how many were recorded more than an hour after they happened, how many were recorded before they happened, and how many packages have no delivered scan?",
      tables: ["tracking_events", "packages"],
      columns: ["scan_events", "recorded_over_1h_late", "recorded_before_event", "packages_not_delivered"],
      grain: "one summary row", ordered: false,
      definitions: [
        "recorded_over_1h_late: julianday(recorded_at) − julianday(event_at) > 1/24. recorded_before_event: recorded_at < event_at.",
        "packages_not_delivered: packages with no tracking event of type 'delivered'.",
      ],
      hints: ["1.0/24 is one hour in julianday units.", "NOT EXISTS finds packages without a delivered scan.", "A scalar subquery can sit beside the aggregates."],
      finding: "How common are late scans, and why does a scan recorded before it happened matter?",
      sql: `
SELECT COUNT(*) AS scan_events,
       SUM(julianday(recorded_at) - julianday(event_at) > 1.0 / 24) AS recorded_over_1h_late,
       SUM(recorded_at < event_at) AS recorded_before_event,
       (SELECT COUNT(*) FROM packages AS p
        WHERE NOT EXISTS (SELECT 1 FROM tracking_events AS e WHERE e.package_id = p.package_id AND e.event_type = 'delivered')) AS packages_not_delivered
FROM tracking_events`,
    },
    {
      kind: "checkpoint", id: "service-levels", title: "Measure on-time delivery by service",
      context: "A shipment is on time when its last package is delivered on or before the promised date. Use complete shipments only.",
      investigation: "For each service level, how many complete shipments were delivered, how many on time, and what share?",
      tables: ["shipments", "packages", "tracking_events", "service_levels"],
      columns: ["service_name", "delivered_shipments", "on_time", "on_time_pct"],
      grain: "one row per service level, worst first", ordered: true,
      definitions: [
        "A shipment's delivered_at = latest 'delivered' scan across its packages; it is complete when every package has a delivered scan.",
        "On time: date(delivered_at) <= promised_delivery_date. on_time_pct = 100 × on_time / delivered_shipments, 1 decimal. Order by on_time_pct, then service_name.",
      ],
      hints: [
        "Compute delivered_at and the number of delivered packages per shipment in a CTE.",
        "Compare that count with the shipment's total packages to keep complete shipments.",
        "Join shipments and service_levels, then group.",
      ],
      finding: "Which services break their promise most? Do premium services do better or worse than ground?",
      sql: `
WITH ${DELIVERED}
SELECT sl.service_name,
       COUNT(*) AS delivered_shipments,
       SUM(date(c.delivered_at) <= s.promised_delivery_date) AS on_time,
       ROUND(100.0 * SUM(date(c.delivered_at) <= s.promised_delivery_date) / COUNT(*), 1) AS on_time_pct
FROM complete AS c
JOIN shipments AS s ON s.shipment_id = c.shipment_id
JOIN service_levels AS sl ON sl.service_level_id = s.service_level_id
GROUP BY sl.service_level_id
ORDER BY on_time_pct, sl.service_name`,
    },
    {
      kind: "checkpoint", id: "carriers", title: "Compare carriers with their targets",
      context: "Each carrier has a contractual on-time target. Compare its actual rate with that target.",
      investigation: "For each carrier, what is its on-time target, how many complete shipments did it deliver, what was its on-time rate, and how far from target is it?",
      tables: ["shipments", "packages", "tracking_events", "carriers"],
      columns: ["carrier_name", "on_time_target_pct", "delivered_shipments", "on_time_pct", "gap_to_target"],
      grain: "one row per carrier, furthest below target first", ordered: true,
      definitions: [
        "Use the complete-shipment and on-time definitions from the previous step; the carrier is shipments.carrier_id.",
        "gap_to_target = on-time percentage − on_time_target_pct, from the unrounded rate, 1 decimal. Order by gap_to_target, then carrier_name.",
      ],
      hints: ["Reuse the same CTEs.", "Join carriers on shipments.carrier_id.", "Compute the gap from the unrounded rate before rounding."],
      finding: "Which carriers miss their targets by the widest margin, and how many shipments do they carry?",
      sql: `
WITH ${DELIVERED}
SELECT ca.carrier_name,
       ca.on_time_target_pct,
       COUNT(*) AS delivered_shipments,
       ROUND(100.0 * SUM(date(c.delivered_at) <= s.promised_delivery_date) / COUNT(*), 1) AS on_time_pct,
       ROUND(100.0 * SUM(date(c.delivered_at) <= s.promised_delivery_date) / COUNT(*) - ca.on_time_target_pct, 1) AS gap_to_target
FROM complete AS c
JOIN shipments AS s ON s.shipment_id = c.shipment_id
JOIN carriers AS ca ON ca.carrier_id = s.carrier_id
GROUP BY ca.carrier_id
ORDER BY gap_to_target, ca.carrier_name`,
    },
    {
      kind: "checkpoint", id: "first-attempts", title: "Find where first attempts fail",
      context: "Every failed first attempt costs a second trip. Compare destination states with enough volume.",
      investigation: "Among destination states with at least 300 first attempts, which ten have the lowest first-attempt success rate?",
      tables: ["delivery_attempts", "packages", "shipments"],
      columns: ["destination_state", "first_attempts", "delivered_first_time", "first_attempt_success_pct"],
      grain: "ten states, lowest success first", ordered: true,
      definitions: [
        "First attempts: delivery_attempts with attempt_number = 1. Success: outcome = 'delivered'.",
        "Keep states with at least 300 first attempts. first_attempt_success_pct to 1 decimal. Order by the rate, then destination_state; return 10 rows.",
      ],
      hints: ["Join attempts → packages → shipments for destination_state.", "HAVING COUNT(*) >= 300.", "LIMIT 10."],
      finding: "How much do first-attempt success rates vary between states? Is the spread large enough to target?",
      sql: `
SELECT s.destination_state,
       COUNT(*) AS first_attempts,
       SUM(d.outcome = 'delivered') AS delivered_first_time,
       ROUND(100.0 * SUM(d.outcome = 'delivered') / COUNT(*), 1) AS first_attempt_success_pct
FROM delivery_attempts AS d
JOIN packages AS p ON p.package_id = d.package_id
JOIN shipments AS s ON s.shipment_id = p.shipment_id
WHERE d.attempt_number = 1
GROUP BY s.destination_state
HAVING COUNT(*) >= 300
ORDER BY first_attempt_success_pct, s.destination_state
LIMIT 10`,
    },
  ],
  synthesis: {
    title: "Review network reliability",
    investigation: "Connect scan quality, service promises, carrier performance and first attempts.",
    reviewPrompt: "Is the reliability problem about services, carriers or the last mile? Which two actions follow, and what would you verify first?",
  },
  report: {
    context: "The network operations director will commit to two actions.",
    investigation: "Deliver three findings and two priority actions.",
    summary: "Summarize scan quality, service and carrier on-time rates, and first-attempt failures with numbers.",
    recommendation: "Name two priority actions and the evidence for each.",
    limitations: "Explain the limits: synthetic data, incomplete shipments excluded, date-level promises, and late scans.",
  },
});

export const trustedRetailWarehouse = defineProject({
  id: "trusted-retail-warehouse",
  title: "Build a Trusted Retail Warehouse",
  level: "advanced",
  role: "Analytics Engineer",
  datasetId: "retail",
  brief: {
    who: "You are the analytics engineer for the Retail commercial team.",
    situation: "Analysts query raw invoice tables directly, and their numbers disagree. You will build a small star schema (staging, dimensions and a sales fact), make the daily load safe to rerun, add quality checks, and publish one reporting view that reconciles to the source.",
    ask: "Can you build a warehouse whose monthly sales reconcile exactly to the source invoices, and prove it with checks?",
    data: "Retail: two years of real invoice lines (December 2009 – 9 December 2011) with products, departments, customers and their segment history.",
    deliverable: "A warehouse handoff: build decisions, validation results and known limitations.",
  },
  prerequisites: ["CREATE TABLE / VIEW", "INSERT … SELECT", "Keys and constraints", "Idempotent loads", "Reconciliation"],
  placementAfter: ["warehouse"],
  relevantTables: ["orders", "order_items", "products", "categories", "customers", "customer_history"],
  understand: {
    title: "Understand the source tables",
    context: "orders has one row per invoice header (sale or cancellation); order_items has one row per line, joined on order_id, with signed quantity and unit_price. products has one row per stock_code and links to categories (department). customers has one row per identified customer; anonymous invoices have customer_id NULL. customer_history keeps each customer's segment over time; is_current = 1 marks the current version. Each build step runs on top of the steps you have already passed.",
    investigation: "Count the rows in each source table. Which keys will the fact table need?",
  },
  steps: [
    {
      kind: "checkpoint", id: "profile", title: "Profile the source",
      context: "Record the control totals the warehouse must reproduce.",
      investigation: "How many invoices, invoice lines, customers and products are there, how many lines are anonymous, and what is the net value of all lines?",
      tables: ["orders", "order_items", "customers", "products"],
      columns: ["invoices", "invoice_lines", "customers", "products", "anonymous_lines", "net_value"],
      grain: "one summary row", ordered: false,
      definitions: ["anonymous_lines: lines whose invoice has no customer_id. net_value = sum of quantity × unit_price over all lines, 2 decimals."],
      hints: ["Scalar subqueries give each table's count.", "Join order_items to orders to find anonymous lines.", "Keep every line, including cancellations."],
      finding: "Record these control totals. Which one will you use to prove the fact table is complete?",
      sql: `
SELECT (SELECT COUNT(*) FROM orders) AS invoices,
       (SELECT COUNT(*) FROM order_items) AS invoice_lines,
       (SELECT COUNT(*) FROM customers) AS customers,
       (SELECT COUNT(*) FROM products) AS products,
       (SELECT COUNT(*) FROM order_items AS i JOIN orders AS o ON o.order_id = i.order_id WHERE o.customer_id IS NULL) AS anonymous_lines,
       (SELECT ROUND(SUM(quantity * unit_price), 2) FROM order_items) AS net_value`,
    },
    {
      kind: "build", id: "build-staging", title: "Stage the raw invoices",
      context: "Staging tables are exact copies of the source, so every later step can be traced back.",
      investigation: "Create stg_orders and stg_order_items as exact copies of orders and order_items.",
      tables: ["orders", "order_items"],
      definitions: ["stg_orders and stg_order_items must have the same rows and values as their sources.", "Keep every column. Do not filter or transform."],
      hints: ["CREATE TABLE … AS SELECT * FROM … copies a table.", "Check the counts afterwards with SELECT COUNT(*).", "Copy both tables in one script."],
      finding: "How did you confirm the staging tables are exact copies?",
    },
    {
      kind: "build", id: "build-dimensions", title: "Build the dimensions",
      context: "Dimensions describe who, what and when. Give each a surrogate key so the fact does not depend on source identifiers.",
      investigation: "Create dim_customer, dim_product and dim_date.",
      tables: ["customers", "customer_history", "products", "categories", "orders"],
      definitions: [
        "dim_customer(customer_key INTEGER PRIMARY KEY, customer_id UNIQUE, country, region, segment): one row per customer; segment from the current customer_history row.",
        "dim_product(product_key INTEGER PRIMARY KEY, stock_code UNIQUE, description, department): one row per product; department from categories, 'Uncategorised' when missing.",
        "dim_date(date_key TEXT PRIMARY KEY): one row per distinct invoice date, formatted YYYY-MM-DD.",
      ],
      hints: ["An INTEGER PRIMARY KEY is filled automatically when you omit it in INSERT.", "LEFT JOIN customer_history with is_current = 1 in the join condition.", "date(ordered_at) gives YYYY-MM-DD."],
      finding: "Which design choice did you make for products without a category, and why?",
    },
    {
      kind: "build", id: "build-fact", title: "Build the sales fact",
      context: "The fact table has one row per invoice line and points at the dimensions by surrogate key.",
      investigation: "Create fact_sales with one row per order_items row.",
      tables: ["order_items", "orders"],
      definitions: [
        "fact_sales(order_item_id UNIQUE, order_id, date_key, customer_key, product_key, quantity, line_value).",
        "line_value = quantity × unit_price. customer_key is NULL for anonymous invoices. Keep cancellation lines.",
      ],
      hints: ["Join order_items → orders, then look up each key in its dimension.", "LEFT JOIN dim_customer so anonymous lines stay.", "Compare the row count with order_items when you are done."],
      finding: "How did you prove the fact has exactly one row per source line?",
    },
    {
      kind: "build", id: "incremental-load", title: "Make the load safe to rerun",
      context: "This step starts with December 2011 missing from fact_sales, as if the latest day's invoices had not loaded. Your load must add only missing lines and change nothing when it runs again.",
      investigation: "Write an INSERT that adds the order_items rows missing from fact_sales, safe to run twice.",
      tables: ["order_items", "orders"],
      definitions: ["After your script, fact_sales must again hold exactly one row per order_items row.", "Running the same script a second time must not add or change any row."],
      hints: ["INSERT … SELECT … WHERE NOT EXISTS (SELECT 1 FROM fact_sales WHERE order_item_id = …).", "Reuse the key lookups from the fact build.", "The check reruns your script to prove it is idempotent."],
      finding: "Why is NOT EXISTS (or a unique key with ON CONFLICT) what makes this load safe to repeat?",
    },
    {
      kind: "build", id: "quality-checks", title: "Add quality checks",
      context: "Publish checks as a view so anyone can see whether the warehouse is healthy.",
      investigation: "Create a view quality_checks with columns check_name, passed and observed_value, holding four named checks.",
      tables: [],
      definitions: [
        "Checks: 'orphan_product_keys' (fact rows whose product_key is not in dim_product), 'orphan_customer_keys' (non-NULL customer_key not in dim_customer), 'fact_reconciles_to_source' (absolute difference between fact and source total value), 'duplicate_order_items' (fact rows minus distinct order_item_id).",
        "passed is 1 when observed_value is 0, else 0.",
      ],
      hints: ["UNION ALL one SELECT per check.", "Round the reconciliation difference to 2 decimals before comparing with 0.", "A view stores the query, so it re-checks every time it is read."],
      finding: "Which check would catch a broken incremental load first?",
    },
    {
      kind: "build", id: "publish-reporting", title: "Publish the reporting view",
      context: "Analysts will query one view instead of the raw tables. It must reconcile to the source.",
      investigation: "Create a view v_sales_monthly with month, invoices, net_sales and gross_sales, built from fact_sales.",
      tables: [],
      definitions: [
        "month = first 7 characters of date_key. invoices = distinct order_id. net_sales = sum of line_value, 2 decimals.",
        "gross_sales = sum of positive line_value, 2 decimals. The view must read from fact_sales.",
      ],
      hints: ["Group fact_sales by substr(date_key, 1, 7).", "SUM(CASE WHEN line_value > 0 THEN line_value ELSE 0 END) gives gross sales.", "The check compares every month with the source."],
      finding: "How would you show an analyst that the view's numbers match the source?",
    },
  ],
  synthesis: {
    title: "Review the build",
    investigation: "Connect the staging, dimensional design, incremental load and checks into one handoff.",
    reviewPrompt: "What makes this warehouse trustworthy? Which risk remains, and how would you monitor it?",
  },
  report: {
    context: "The commercial team's analysts will start using v_sales_monthly.",
    investigation: "Hand over the build: decisions, validation and limitations.",
    titles: ["Engineering summary", "Validation results", "Known limitations"],
    summary: "Describe the star schema you built and the key design decisions.",
    recommendation: "Report your validation evidence: control totals, quality checks and the rerun test.",
    limitations: "Explain what the warehouse does not handle yet: segment history in the fact, late corrections, and the incomplete December 2011.",
  },
});

export const advancedCatalog = [saasActivationRetention, paymentReconciliation, deliveryNetworkReliability, trustedRetailWarehouse];
