# SQL Projects stage manifest

Implementation-ready stage specifications for the locked 10-project catalog.

Product rules: [`PROJECTS.md`](./PROJECTS.md)  
Compile-time schema: [`src/content/projects/types.ts`](../../src/content/projects/types.ts)

**Conventions**

- Do not copy full column dictionaries here. Use `relevantTables` + project-specific notes; schema comes from canonical dataset metadata at runtime.
- Prompts never name SQL functions.
- `referenceId` values are hidden grader keys; never learner-visible.
- All projects use `datasetVersion: 1` (maps later from catalog `"1.0.0"`).
- Stage counts are locked: 8 / 8 / 8 / 9 / 9 / 9 / 10 / 10 / 10 / 13.

---

# 01 — Retail Performance Review

Retail content is now locked at content revision 2. The earlier generic baseline/monthly/top-net-products/customer-split specification is superseded.

- [Exact brief, eight stages, metric definitions, expected columns/grain, hints, interpretation prompts, and report structure](content-audits/RETAIL_LOCKED_CONTRACT.md)
- [Content audit, dataset findings, progression, hidden edge cases, and acceptance criteria](content-audits/RETAIL_AUDIT.md)
- [Machine-readable content lock](content-audits/retail-performance-v2.json)

Dataset identity remains `retail` / `1.0.0` / `project`. Existing drafts are retained; analytical checks and final report completion must be renewed for the updated content. Projects UX is frozen. Projects 02–10 below have not received this content-quality audit yet.

# 02 — Airline Reliability Review

- **id:** `airline-reliability-review`
- **Level:** Beginner
- **Role:** Airline Operations Analyst
- **Dataset:** `flights` (Regional Air Operations) · version `1`
- **Placement:** after dates / conditional aggregation

## Brief

| Field | Text |
| --- | --- |
| **who** | You support an airline operations team. |
| **situation** | Complaints about unreliable travel have increased. Leadership does not know whether problems concentrate by airline, airport, route, or time of day. |
| **ask** | Where is unreliable travel coming from, and where should operations focus first? |
| **data** | Regional Air Operations — scheduled flight legs with delays, early departures, and cancellations (synthetic; not BTS). |
| **deliverable** | Evidence-backed reliability assessment with 3–5 findings and a concise operational recommendation. |

## Prerequisites

- joins
- aggregation
- dates / time extraction
- CASE / conditional aggregation
- NULL handling

## Relevant tables

`airlines`, `airports`, `routes`, `flights`

## Metric definitions

- **Scheduled flights** = all `flights` rows in scope.
- **Completed / operated** = `cancelled = 0`.
- **Cancelled** = `cancelled = 1`.
- **Cancellation rate** = cancelled / scheduled.
- **Departure delay** = `departure_delay_minutes` only when not cancelled (NULL on cancellations — never treat as 0).
- **Delayed flight** (for rates) = operated and `departure_delay_minutes > 0` (reference may also report on-time as delay ≤ 0).
- **Average delay** = average of known `departure_delay_minutes` among operated flights only.
- Negative delay means early departure.

## Report template

| id | title | required | allowEvidence | prompt |
| --- | --- | --- | --- | --- |
| executive_summary | Executive summary | true | false | 2–4 sentences on where unreliability concentrates. |
| findings | Key findings | true | true | 3–5 findings with evidence. |
| recommendation | Operational recommendation | true | true | Where should operations focus first, and why? |
| limitations | Limitations | true | false | Synthetic schedule limits; UTC-only timestamps; no local airport time. |

---

## Stage 01 — Project brief

- **id:** `brief` · **type:** orientation
- **investigation:** Confirm role, question, and deliverable.
- **validation:** none · **completion:** all false

## Stage 02 — Understand Regional Air Operations

- **id:** `understand-data` · **type:** orientation
- **relevantTables:** `flights`, `airlines`, `airports`, `routes`
- **notes:** One `flights` row = one scheduled leg. Delay is NULL when cancelled. All timestamps UTC. Airport codes are synthetic.
- **validation:** none · **completion:** all false

## Stage 03 — Reliability baseline

- **id:** `baseline` · **type:** checkpoint
- **investigation:** Establish scheduled, operated, cancelled, cancellation rate, and average departure delay for the edition.
- **relevantTables:** `flights`
- **expectedColumns:** `scheduled_flights`, `operated_flights`, `cancelled_flights`, `cancellation_rate`, `avg_departure_delay_minutes`
- **grain:** one row for the edition
- **validation:** checkpoint · ordered false · referenceId `airline-reliability-baseline`
  - invariants: cancelled excluded from avg delay; cancellation_rate uses scheduled denominator
- **hints:** (1) Separate cancellation from delay. (2) NULL delay is not zero.
- **findingPrompt:** What is the overall reliability picture before slicing by airline or airport?
- **completion:** validation+finding+evidence

## Stage 04 — Airline performance

- **id:** `airlines` · **type:** checkpoint
- **investigation:** Compare airlines on volume, cancellation rate, delay rate, and average delay.
- **relevantTables:** `flights`, `airlines`
- **expectedColumns:** `airline`, `scheduled_flights`, `operated_flights`, `cancellation_rate`, `delay_rate`, `avg_departure_delay_minutes`
- **grain:** one row per airline
- **validation:** checkpoint · ordered false · referenceId `airline-reliability-by-airline`
  - invariants: delay_rate = operated with delay > 0 / operated; avg delay excludes cancellations
- **hints:** (1) Join airline names. (2) Keep scheduled and operated denominators distinct.
- **findingPrompt:** Which airlines look weakest on cancellations vs delay, and is volume comparable?
- **completion:** validation+finding+evidence

## Stage 05 — Airports and routes

- **id:** `airports-routes` · **type:** checkpoint
- **investigation:** Find origins with the worst combination of traffic and reliability (not average delay alone).
- **relevantTables:** `flights`, `routes`, `airports`
- **expectedColumns:** `origin_code`, `scheduled_flights`, `cancellation_rate`, `avg_departure_delay_minutes`
- **grain:** one row per origin airport; reference returns top 10 by scheduled_flights among origins with cancellation_rate above edition median OR avg delay above edition median (exact rule locked in reference)
- **validation:** checkpoint · ordered true · referenceId `airline-reliability-worst-origins`
- **hints:** (1) Origin comes through routes. (2) High volume matters for operational impact.
- **findingPrompt:** Are reliability problems concentrated at particular origins?
- **completion:** validation+finding+evidence

## Stage 06 — Timing patterns

- **id:** `timing` · **type:** checkpoint
- **investigation:** Compare reliability by hour of scheduled departure (UTC).
- **relevantTables:** `flights`
- **expectedColumns:** `departure_hour_utc`, `scheduled_flights`, `cancellation_rate`, `avg_departure_delay_minutes`
- **grain:** one row per hour 0–23
- **validation:** checkpoint · ordered true · referenceId `airline-reliability-by-hour`
- **hints:** (1) Extract hour from scheduled_departure. (2) Keep cancelled out of delay averages.
- **findingPrompt:** Which departure hours show the weakest reliability?
- **completion:** validation+finding+evidence

## Stage 07 — Operational recommendation

- **id:** `synthesis` · **type:** synthesis
- **investigation:** Prioritize where operations should act first (airline vs airport vs timing).
- **findingPrompt:** State the priority focus area and the evidence that supports it.
- **validation:** none · **completion:** finding only

## Stage 08 — Report

- **id:** `report` · **type:** report
- **investigation:** Complete report sections and attach evidence.
- **validation:** none · **completion:** finding required (report fields)

---

# 03 — Urban Mobility Demand

- **id:** `urban-mobility-demand`
- **Level:** Beginner
- **Role:** Transportation / Dispatch Analyst
- **Dataset:** `mobility` (City Mobility) · version `1`
- **Placement:** after dates / joins

## Brief

| Field | Text |
| --- | --- |
| **who** | You are a dispatch analyst for a city mobility service. |
| **situation** | Capacity is unevenly positioned. Leadership needs demand patterns by time and place, plus honest tip/fare economics. |
| **ask** | Where and when should transportation capacity be positioned? |
| **data** | City Mobility — fictional trips with zones, rush-hour demand, and payment-dependent tip coverage. |
| **deliverable** | Dispatch recommendation covering where and when capacity is most needed, with supporting evidence. |

## Prerequisites

- joins
- aggregation
- dates / hours
- NULL handling
- rates

## Relevant tables

`districts`, `zones`, `payment_types`, `trips`

## Metric definitions

- **Trip** = one `trips` row (completed trip in this model).
- **Duration minutes** = difference between `dropped_off_at` and `picked_up_at` (in minutes).
- **Fare** = `fare_cents` (excludes tip).
- **Tip** = `tip_cents`; **NULL means unobserved**, not zero. Valid tip analysis is card payments only (`payment_types.label = 'card'`).
- **Same-zone trip** = pickup_zone = dropoff_zone.
- Do not average tips across cash/disputed with card.

## Report template

| id | title | required | allowEvidence | prompt |
| --- | --- | --- | --- | --- |
| executive_summary | Executive summary | true | false | Where/when demand concentrates. |
| findings | Key findings | true | true | Demand, geography, economics findings. |
| recommendation | Dispatch recommendation | true | true | Where and when to position capacity. |
| limitations | Limitations | true | false | Synthetic city; tip coverage; UTC timestamps. |

---

## Stage 01 — Project brief

- **id:** `brief` · **type:** orientation · **validation:** none · **completion:** all false

## Stage 02 — Understand City Mobility

- **id:** `understand-data` · **type:** orientation
- **relevantTables:** `trips`, `zones`, `districts`, `payment_types`
- **notes:** Tip is NULL for cash/disputed. Zones nest under districts. Peak hours exist in the generator; validate before assuming.
- **validation:** none · **completion:** all false

## Stage 03 — Validate trip quality

- **id:** `validate-trips` · **type:** checkpoint
- **investigation:** Profile data quality: trip counts by payment type, NULL tip share, same-zone share, and duration outliers (e.g. duration ≤ 0 or extreme).
- **relevantTables:** `trips`, `payment_types`
- **expectedColumns:** `payment_label`, `trips`, `null_tip_trips`, `same_zone_trips`, `avg_distance_m`, `avg_duration_minutes`
- **grain:** one row per payment type
- **validation:** checkpoint · ordered false · referenceId `mobility-demand-quality-by-payment`
  - invariants: NULL tips counted; same-zone uses pickup=dropoff; duration from timestamps
- **hints:** (1) Join payment labels. (2) NULL tip ≠ zero tip.
- **findingPrompt:** Which quality issues would distort demand or economics if ignored?
- **completion:** validation+finding+evidence

## Stage 04 — Demand by time

- **id:** `demand-time` · **type:** checkpoint
- **investigation:** Measure trip volume by hour of pickup (UTC).
- **relevantTables:** `trips`
- **expectedColumns:** `pickup_hour_utc`, `trips`, `avg_distance_m`, `avg_fare_cents`
- **grain:** one row per hour 0–23
- **validation:** checkpoint · ordered true · referenceId `mobility-demand-by-hour`
- **hints:** (1) Extract hour from picked_up_at. (2) Volume is the primary dispatch signal here.
- **findingPrompt:** Which hours need capacity most?
- **completion:** validation+finding+evidence

## Stage 05 — Demand by location

- **id:** `demand-location` · **type:** checkpoint
- **investigation:** Rank pickup zones by trip volume and show district + zone kind.
- **relevantTables:** `trips`, `zones`, `districts`
- **expectedColumns:** `zone_id`, `district`, `kind`, `pickup_trips`, `avg_fare_cents`
- **grain:** one row per zone; ordered by pickup_trips desc
- **validation:** checkpoint · ordered true · referenceId `mobility-demand-by-pickup-zone`
- **hints:** (1) Aggregate pickups before joining labels. (2) District comes through zones.
- **findingPrompt:** Which zones should dispatch prioritize, and are they residential, business, or airport?
- **completion:** validation+finding+evidence

## Stage 06 — Trip economics

- **id:** `economics` · **type:** checkpoint
- **investigation:** For card trips only, summarize distance, fare, tip, and tip rate.
- **relevantTables:** `trips`, `payment_types`
- **expectedColumns:** `trips`, `avg_distance_m`, `avg_fare_cents`, `avg_tip_cents`, `avg_tip_rate`
- **grain:** one summary row for card payments
- **validation:** checkpoint · ordered false · referenceId `mobility-demand-card-economics`
  - invariants: card only; tip averages exclude NULL tips or use only non-NULL tips per reference; tip_rate = tip/fare among tipped card trips
- **hints:** (1) Filter to card before averaging tips. (2) Define tip rate denominator carefully.
- **findingPrompt:** What do fare and tip patterns imply for driver incentives in high-demand zones/hours?
- **completion:** validation+finding+evidence

## Stage 07 — Dispatch recommendation

- **id:** `synthesis` · **type:** synthesis
- **investigation:** Recommend where and when to position capacity.
- **findingPrompt:** State where, when, and why—citing evidence.
- **validation:** none · **completion:** finding only

## Stage 08 — Report

- **id:** `report` · **type:** report · **validation:** none · **completion:** finding required

---

# 04 — Healthcare Operations

- **id:** `healthcare-operations`
- **Level:** Intermediate
- **Role:** Healthcare Operations Analyst
- **Dataset:** `healthcare` (Clinic Operations) · version `1`
- **Placement:** after windows / multi-table analysis

## Brief

| Field | Text |
| --- | --- |
| **who** | You are a healthcare operations analyst (not a clinician). |
| **situation** | Clinics report uneven workload and appointment friction. Leadership needs operational bottlenecks—not clinical diagnosis. |
| **ask** | Where are the operational bottlenecks in patient care delivery? |
| **data** | Clinic Operations — synthetic patients, encounters, cancellations, and operational wait/consultation observations. |
| **deliverable** | Operations assessment with workload, completion, repeat utilization, and staffing/process priorities. No causal or medical claims. |

## Prerequisites

- multi-table joins
- CTEs
- date differences
- window ranking (capability; do not name in prompts)
- conditional aggregation

## Relevant tables

`providers`, `patients`, `encounters`, `observations`

## Metric definitions

- **Encounter grain** = one `encounters` row. Do not multiply by `observations`.
- **Completed encounter** = `status = 'completed'`.
- **Cancelled encounter** = `status = 'cancelled'` (`ended_at` NULL).
- **Completion rate** = completed / scheduled encounters.
- **Wait / consultation minutes** = `observations.value` for `kind` in (`wait_minutes`, `consultation_minutes`) on completed encounters only.
- **Repeat utilization** = patients with another completed encounter within N days of a prior completed encounter (project uses **14 days** unless a stage says otherwise).
- Patients may have zero encounters. No diagnoses exist in this dataset.

## Report template

| id | title | required | allowEvidence | prompt |
| --- | --- | --- | --- | --- |
| executive_summary | Executive summary | true | false | Operational bottlenecks in plain language. |
| findings | Key findings | true | true | Workload, completion, repeat use, timing. |
| recommendation | Operations recommendation | true | true | Staffing or process areas to review first. |
| limitations | Limitations | true | false | Synthetic ops data; no clinical outcomes. |

---

## Stage 01 — Project brief

- **id:** `brief` · **type:** orientation · **validation:** none · **completion:** all false

## Stage 02 — Understand patient and encounter grain

- **id:** `understand-data` · **type:** orientation
- **relevantTables:** `patients`, `encounters`, `providers`, `observations`
- **notes:** Joining observations without aggregating duplicates encounter counts. Cancellations are not completed care. `previous_encounter_id` chains completed visits only.
- **validation:** none · **completion:** all false

## Stage 03 — Operational baseline

- **id:** `baseline` · **type:** checkpoint
- **investigation:** Count patients, scheduled encounters, completed, cancelled, completion rate; report average wait and consultation among completed encounters with observations.
- **relevantTables:** `patients`, `encounters`, `observations`
- **expectedColumns:** `patients`, `scheduled_encounters`, `completed_encounters`, `cancelled_encounters`, `completion_rate`, `avg_wait_minutes`, `avg_consultation_minutes`
- **grain:** one summary row
- **validation:** checkpoint · ordered false · referenceId `healthcare-ops-baseline`
  - invariants: averages from observation kinds without fan-out into encounter counts; cancelled excluded from wait averages
- **hints:** (1) Protect encounter grain when touching observations. (2) Separate scheduled vs completed denominators.
- **findingPrompt:** What is the baseline operational load and friction?
- **completion:** validation+finding+evidence

## Stage 04 — Provider and facility workload

- **id:** `workload` · **type:** checkpoint
- **investigation:** Visits (completed encounters) per provider and clinic.
- **relevantTables:** `encounters`, `providers`
- **expectedColumns:** `provider_id`, `clinic`, `completed_encounters`, `cancelled_encounters`, `completion_rate`
- **grain:** one row per provider
- **validation:** checkpoint · ordered false · referenceId `healthcare-ops-provider-workload`
- **hints:** (1) Clinic is on providers. (2) Include providers with volume for fair comparison.
- **findingPrompt:** Where is workload concentrated, and which clinics look overloaded relative to peers?
- **completion:** validation+finding+evidence

## Stage 05 — Appointment outcomes

- **id:** `appointment-outcomes` · **type:** exploration
- **investigation:** Explore cancellation patterns by clinic, age band, or period. Save at least one useful result that explains where cancellations concentrate.
- **relevantTables:** `encounters`, `providers`, `patients`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **hints:** (1) Choose one slice that is actionable for operations.
- **findingPrompt:** Where do cancellations concentrate, and what might operations review next?
- **completion:** `{ requiresValidation: false, requiresFinding: true, requiresEvidence: true }`

## Stage 06 — Repeat utilization

- **id:** `repeat-utilization` · **type:** checkpoint
- **investigation:** Identify patients with a completed encounter followed by another completed encounter within 14 days; report count of such patients and share of patients with ≥1 completed encounter.
- **relevantTables:** `encounters`, `patients`
- **expectedColumns:** `patients_with_completed`, `patients_with_14d_return`, `return_rate`
- **grain:** one summary row
- **validation:** checkpoint · ordered false · referenceId `healthcare-ops-14d-return`
  - invariants: only completed encounters; 14-day window on scheduled_at or ended_at per reference; patients with zero completed visits stay out of denominator `patients_with_completed`
- **hints:** (1) Work at patient–encounter grain carefully. (2) Define the return window explicitly.
- **findingPrompt:** How common is short-interval return, and does it suggest access or continuity pressure?
- **completion:** validation+finding+evidence

## Stage 07 — Access and wait patterns

- **id:** `access-wait` · **type:** exploration
- **investigation:** Compare wait_minutes across clinics or providers for completed encounters. Save evidence that highlights outliers without claiming clinical cause.
- **relevantTables:** `encounters`, `observations`, `providers`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **findingPrompt:** Which locations show the most operational wait pressure?
- **completion:** finding+evidence

## Stage 08 — Operations recommendation

- **id:** `synthesis` · **type:** synthesis
- **investigation:** Prioritize staffing or process review areas.
- **findingPrompt:** Name the top operational priorities and the evidence behind them.
- **validation:** none · **completion:** finding only

## Stage 09 — Report

- **id:** `report` · **type:** report · **validation:** none · **completion:** finding required

---

# 05 — Grid Demand & Generation

- **id:** `grid-demand-generation`
- **Level:** Intermediate
- **Role:** Grid Operations Analyst
- **Dataset:** `energy` (Regional Grid) · version `1`
- **Placement:** after windows / time-series

## Brief

| Field | Text |
| --- | --- |
| **who** | You analyze a fictional regional electricity balancing grid. |
| **situation** | Leadership needs to know when the grid is under pressure and how generation and transfers respond. |
| **ask** | When is the grid under the most pressure, and how is generation responding? |
| **data** | Regional Grid — hourly demand, forecasts, fuel generation, and directional interchange. |
| **deliverable** | Operations findings on peaks, forecast quality, generation mix, and rapid changes. |

## Prerequisites

- CTEs
- window / lag capability (do not name in prompts)
- date/time
- share-of-total
- ranking
- conditional aggregation

## Relevant tables

`regions`, `hourly_demand`, `generation`, `interchange`

## Metric definitions

- **Demand** = `hourly_demand.demand_mw` (average MW for the hour ≈ MWh for 1-hour intervals).
- **Forecast error** = `forecast_mw - demand_mw` (signed). **MAE** = absolute error average.
- **Generation share** for a fuel = fuel output / total generation in the same region-hour (or scope stated by stage).
- **Renewable generation** = fuels `solar` + `wind` (dispatchable is separate).
- **Balance check:** generation + imports − exports should reconcile to demand in the base fixture; aggregate generation to region-hour **before** joining interchange to avoid fan-out.
- Interchange rows are directional (from_region → to_region); do not invent reverse duplicates.

## Report template

| id | title | required | allowEvidence | prompt |
| --- | --- | --- | --- | --- |
| executive_summary | Executive summary | true | false | Peak pressure and generation response. |
| findings | Key findings | true | true | Peaks, forecast, mix, changes. |
| recommendation | Operations findings | true | true | What operators should watch first. |
| limitations | Limitations | true | false | Synthetic grid; no storage/losses/prices. |

---

## Stage 01 — Project brief

- **id:** `brief` · **type:** orientation · **validation:** none · **completion:** all false

## Stage 02 — Understand energy time grain

- **id:** `understand-data` · **type:** orientation
- **relevantTables:** `regions`, `hourly_demand`, `generation`, `interchange`
- **notes:** Generation is region-hour-fuel. Interchange is one directed transfer per hour between regions 1 and 2 in this model. Aggregate fuels before balance joins.
- **validation:** none · **completion:** all false

## Stage 03 — Demand baseline

- **id:** `demand-baseline` · **type:** checkpoint
- **investigation:** Daily total demand by region (sum of hourly demand_mw).
- **relevantTables:** `hourly_demand`, `regions`
- **expectedColumns:** `region`, `day`, `demand_mwh`
- **grain:** one row per region per UTC calendar day
- **validation:** checkpoint · ordered true · referenceId `grid-demand-daily-by-region`
- **hints:** (1) Derive day from hour timestamp. (2) Sum hours within the day.
- **findingPrompt:** How does load differ across regions and days?
- **completion:** validation+finding+evidence

## Stage 04 — Peak-demand investigation

- **id:** `peaks` · **type:** checkpoint
- **investigation:** Identify the top demand hours system-wide (all regions summed) and list hour, total demand, and top region contribution.
- **relevantTables:** `hourly_demand`, `regions`
- **expectedColumns:** `hour`, `system_demand_mw`, `top_region`, `top_region_demand_mw`
- **grain:** one row per hour for the top 24 system hours by system_demand_mw
- **validation:** checkpoint · ordered true · referenceId `grid-demand-top24-hours`
- **hints:** (1) Aggregate to system hour first. (2) Then identify which region led that hour.
- **findingPrompt:** When is the system under the most pressure?
- **completion:** validation+finding+evidence

## Stage 05 — Forecast accuracy

- **id:** `forecast` · **type:** checkpoint
- **investigation:** Bias and MAE by region.
- **relevantTables:** `hourly_demand`, `regions`
- **expectedColumns:** `region`, `bias_mw`, `mae_mw`
- **grain:** one row per region
- **validation:** checkpoint · ordered false · referenceId `grid-forecast-by-region`
  - invariants: bias = avg(forecast − demand); mae = avg(abs(forecast − demand))
- **hints:** (1) Signed bias can hide large absolute errors.
- **findingPrompt:** Which regions forecast poorly, and is the problem bias or absolute error?
- **completion:** validation+finding+evidence

## Stage 06 — Generation mix

- **id:** `generation-mix` · **type:** checkpoint
- **investigation:** Renewable share of generation by UTC hour of day (all regions).
- **relevantTables:** `generation`
- **expectedColumns:** `utc_hour`, `renewable_generation_pct`, `total_generation_mw`
- **grain:** one row per hour-of-day 00–23
- **validation:** checkpoint · ordered true · referenceId `grid-renewable-share-by-hour`
  - invariants: ratio of sums (not average of percentages); renewable = solar+wind
- **hints:** (1) Weight by generated MW. (2) Night solar should be zero.
- **findingPrompt:** How does renewable contribution change through the day?
- **completion:** validation+finding+evidence

## Stage 07 — Demand and generation changes

- **id:** `rapid-changes` · **type:** exploration
- **investigation:** Find hours with large hour-over-hour demand or generation swings in a region. Save evidence of the sharpest changes.
- **relevantTables:** `hourly_demand`, `generation`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **hints:** (1) Compare consecutive hours within the same region.
- **findingPrompt:** Where do rapid changes create operational risk?
- **completion:** finding+evidence

## Stage 08 — Findings

- **id:** `synthesis` · **type:** synthesis
- **investigation:** Synthesize peak, forecast, mix, and change findings.
- **findingPrompt:** What should grid operators prioritize?
- **validation:** none · **completion:** finding only

## Stage 09 — Report

- **id:** `report` · **type:** report · **validation:** none · **completion:** finding required

---

# 06 — Engineering Delivery Performance

- **id:** `engineering-delivery-performance`
- **Level:** Intermediate
- **Role:** Engineering Analytics / Developer Productivity Analyst
- **Dataset:** `developer` (Engineering Delivery) · version `1`
- **Placement:** after windows / multi-table

## Brief

| Field | Text |
| --- | --- |
| **who** | You analyze engineering delivery for a multi-team platform. |
| **situation** | Leadership suspects some teams and repositories are becoming delivery bottlenecks. |
| **ask** | Which teams and repositories are becoming delivery bottlenecks? |
| **data** | Engineering Delivery — PRs, reviews, deployments, incidents, and team hierarchy. |
| **deliverable** | Prioritized list of teams/repos needing attention, with throughput and reliability evidence. |

## Prerequisites

- multi-table joins
- CTEs
- date differences
- ranking / top-N capability
- conditional aggregation
- rates

## Relevant tables

`teams`, `developers`, `repositories`, `pull_requests`, `reviews`, `deployments`, `incidents`

## Metric definitions

- **PR** = one `pull_requests` row.
- **Merged** = `merged_at IS NOT NULL`.
- **Merge rate** = merged PRs / opened PRs in scope.
- **Time to first review** = first `reviews.reviewed_at` − `opened_at` (PRs with no review excluded or flagged per stage).
- **Time to merge** = `merged_at` − `opened_at` for merged PRs.
- **Deployment attempt** ≠ successful delivery; status `success` | `failed`. Retries allowed per PR.
- **Incident rate** (stage-defined) typically incidents / successful deployments.
- Review rows are actions, not unique reviewers.

## Report template

| id | title | required | allowEvidence | prompt |
| --- | --- | --- | --- | --- |
| executive_summary | Executive summary | true | false | Where delivery bottlenecks sit. |
| findings | Key findings | true | true | Throughput, review, deploy, trends. |
| recommendation | Engineering priorities | true | true | Teams/repos to support first. |
| limitations | Limitations | true | false | Synthetic attribution; review≠unique people. |

---

## Stage 01 — Project brief

- **id:** `brief` · **type:** orientation · **validation:** none · **completion:** all false

## Stage 02 — Understand development lifecycle

- **id:** `understand-data` · **type:** orientation
- **relevantTables:** `pull_requests`, `reviews`, `deployments`, `incidents`, `repositories`, `teams`
- **notes:** Some teams have no repos. Unmerged PRs exist. Failed deployments can precede success. Incidents attach to successful deployments.
- **validation:** none · **completion:** all false

## Stage 03 — Delivery baseline

- **id:** `baseline` · **type:** checkpoint
- **investigation:** Overall PR volume, merge rate, review coverage (PRs with ≥1 review), deployment attempts, success rate.
- **relevantTables:** `pull_requests`, `reviews`, `deployments`
- **expectedColumns:** `prs_opened`, `prs_merged`, `merge_rate`, `prs_with_review`, `deployment_attempts`, `deployment_success_rate`
- **grain:** one summary row
- **validation:** checkpoint · ordered false · referenceId `eng-delivery-baseline`
- **hints:** (1) Distinct PRs with reviews vs review action counts. (2) Success rate uses attempt denominator.
- **findingPrompt:** What does the overall delivery system look like before slicing?
- **completion:** validation+finding+evidence

## Stage 04 — PR and review performance

- **id:** `review-performance` · **type:** checkpoint
- **investigation:** Per repository: PRs opened, merge rate, median or average hours to first review and to merge (reference locks avg hours).
- **relevantTables:** `pull_requests`, `reviews`, `repositories`
- **expectedColumns:** `repository`, `prs_opened`, `merge_rate`, `avg_hours_to_first_review`, `avg_hours_to_merge`
- **grain:** one row per repository
- **validation:** checkpoint · ordered false · referenceId `eng-delivery-repo-review`
  - invariants: first review per PR; unreviewed PRs excluded from avg_hours_to_first_review; unmerged excluded from merge hours
- **hints:** (1) Compute first review time per PR before averaging. (2) Keep repositories with different volumes comparable via rates.
- **findingPrompt:** Which repositories show slow review or merge turnaround?
- **completion:** validation+finding+evidence

## Stage 05 — Repository throughput

- **id:** `throughput` · **type:** exploration
- **investigation:** Compare teams on PR volume, merge rate, and undeployed merges. Save evidence identifying bottlenecks.
- **relevantTables:** `pull_requests`, `deployments`, `repositories`, `teams`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **findingPrompt:** Which teams look throughput-constrained?
- **completion:** finding+evidence

## Stage 06 — Deployment reliability

- **id:** `deploy-reliability` · **type:** checkpoint
- **investigation:** Per repository: successful deployments, failed attempts, success rate, incidents linked to successes.
- **relevantTables:** `deployments`, `incidents`, `pull_requests`, `repositories`
- **expectedColumns:** `repository`, `success_deployments`, `failed_attempts`, `success_rate`, `incidents`
- **grain:** one row per repository with ≥1 deployment attempt
- **validation:** checkpoint · ordered false · referenceId `eng-delivery-repo-deploy`
- **hints:** (1) Join incidents through successful deployment ids. (2) Retries inflate attempt counts—that is expected.
- **findingPrompt:** Where is deployment reliability weakest relative to volume?
- **completion:** validation+finding+evidence

## Stage 07 — Trend deterioration

- **id:** `deterioration` · **type:** exploration
- **investigation:** Compare recent vs earlier periods (e.g. last 30% of timeline vs prior) for merge rate or deploy success by repository. Save evidence of worsening repos.
- **relevantTables:** `pull_requests`, `deployments`, `repositories`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **hints:** (1) Define periods explicitly in your finding.
- **findingPrompt:** Which repositories are getting worse?
- **completion:** finding+evidence

## Stage 08 — Engineering priorities

- **id:** `synthesis` · **type:** synthesis
- **investigation:** Rank teams/repos for attention.
- **findingPrompt:** Prioritize 3 targets and why.
- **validation:** none · **completion:** finding only

## Stage 09 — Report

- **id:** `report` · **type:** report · **validation:** none · **completion:** finding required

---

# 07 — SaaS Activation & Retention

- **id:** `saas-activation-retention`
- **Level:** Intermediate (hardest intermediate)
- **Role:** Product Analyst
- **Dataset:** `saas` (Workspace Analytics) · version `1`
- **Placement:** after advanced analysis / product analytics lessons

## Brief

| Field | Text |
| --- | --- |
| **who** | You are a product analyst on a B2B workspace product. |
| **situation** | Growth wants to know what separates workspaces that activate and stay from those that disappear. |
| **ask** | What behaviors separate users who activate and stay from users who disappear? |
| **data** | Workspace Analytics — accounts, projects, subscriptions, and retried event deliveries. |
| **deliverable** | Evidence-backed product recommendation on activation and retention, with explicit metric definitions used. |

## Prerequisites

- event deduplication
- CTEs
- windows / first-event logic (capability)
- funnels / cohorts
- conditional aggregation

## Relevant tables

`accounts`, `users`, `projects`, `subscriptions`, `events`

## Metric definitions

- **Logical event** = distinct `event_key` (retries share `event_key`). Prefer `occurred_at` for behavior; `ingested_at` for pipeline lag.
- **Activation (locked for this project):** workspace creates ≥1 `projects` row with `created_at` within **7 days** after `accounts.signed_up_at` (inclusive start, exclusive end at +7 days).
- **Onboarding funnel steps (account-level):** signup (all accounts) → project_created (activated) → invite_sent (logical event) → feature_used within 14 days of signup.
- **Retention D30 window:** feature_used with `occurred_at` in `[signed_up_at+30d, signed_up_at+37d)`.
- Keep inactive workspaces in denominators when measuring activation/retention rates.
- Subscription `monthly_cents` is list price, not realized revenue.

## Report template

| id | title | required | allowEvidence | prompt |
| --- | --- | --- | --- | --- |
| executive_summary | Executive summary | true | false | What separates activated retained workspaces. |
| findings | Key findings | true | true | Quality, activation, funnel, retention. |
| recommendation | Product recommendation | true | true | Strongest evidence-backed product action. |
| limitations | Limitations | true | false | Synthetic correlations ≠ causation. |

---

## Stage 01 — Project brief

- **id:** `brief` · **type:** orientation · **validation:** none · **completion:** all false

## Stage 02 — Understand event grain

- **id:** `understand-data` · **type:** orientation
- **relevantTables:** `accounts`, `events`, `projects`, `subscriptions`, `users`
- **notes:** `delivery_id` is unique; `event_key` repeats on retries. Anonymous `user_id` NULL possible on visits.
- **validation:** none · **completion:** all false

## Stage 03 — Validate event quality

- **id:** `validate-events` · **type:** checkpoint
- **investigation:** Compare delivery count vs distinct event_key, anonymous deliveries, and late arrivals (ingested_at significantly after occurred_at).
- **relevantTables:** `events`
- **expectedColumns:** `deliveries`, `logical_events`, `anonymous_deliveries`, `late_deliveries`
- **grain:** one summary row
- **validation:** checkpoint · ordered false · referenceId `saas-activation-event-quality`
  - invariants: late = ingested at least 1 day after occurred (julianday diff ≥ 1) per reference
- **hints:** (1) Retries inflate deliveries. (2) Decide event_key vs delivery_id for metrics.
- **findingPrompt:** What quality issues must your later metrics account for?
- **completion:** validation+finding+evidence

## Stage 04 — Define activation

- **id:** `define-activation` · **type:** checkpoint
- **investigation:** Split accounts into activated vs not activated using the locked 7-day project rule; retain inactive accounts in the denominator.
- **relevantTables:** `accounts`, `projects`
- **expectedColumns:** `cohort`, `accounts`
- **grain:** one row per cohort (`activated` | `not_activated`)
- **validation:** checkpoint · ordered false · referenceId `saas-activation-cohorts`
  - invariants: start from accounts; 7-day exclusive end; EXISTS/project join must not duplicate accounts
- **hints:** (1) Start from accounts, not events. (2) Implement the written activation definition exactly.
- **findingPrompt:** What share of workspaces activate, and what does that imply for onboarding?
- **completion:** validation+finding+evidence

## Stage 05 — Onboarding funnel

- **id:** `funnel` · **type:** checkpoint
- **investigation:** Account-level funnel counts: signup → activated (project in 7d) → invite_sent (deduped) → feature_used within 14d.
- **relevantTables:** `accounts`, `projects`, `events`
- **expectedColumns:** `step`, `accounts`, `pct_of_signups`
- **grain:** one row per step in order
- **validation:** checkpoint · ordered true · referenceId `saas-activation-funnel`
  - invariants: dedupe event_key; steps are nested subsets of signups
- **hints:** (1) Deduplicate logical events. (2) Keep step definitions consistent with activation.
- **findingPrompt:** Where is the largest absolute drop-off?
- **completion:** validation+finding+evidence

## Stage 06 — Funnel abandonment

- **id:** `abandonment` · **type:** exploration
- **investigation:** Explore who stops between steps (e.g. activated but no feature_used). Save evidence.
- **relevantTables:** `accounts`, `projects`, `events`, `subscriptions`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **findingPrompt:** What characterizes workspaces that stall after partial onboarding?
- **completion:** finding+evidence

## Stage 07 — Retention cohorts

- **id:** `retention` · **type:** checkpoint
- **investigation:** Compare D30 feature retention for activated vs not-activated cohorts.
- **relevantTables:** `accounts`, `projects`, `events`
- **expectedColumns:** `activated`, `accounts`, `retained`, `retention_rate`
- **grain:** one row per activated flag
- **validation:** checkpoint · ordered false · referenceId `saas-activation-d30-retention`
  - invariants: D30 window [+30,+37); dedupe accounts with feature_used; activation as locked
- **hints:** (1) Preserve both cohorts in the denominator. (2) Avoid retry multiplication.
- **findingPrompt:** How strongly does activation associate with D30 activity—and what can you not claim?
- **completion:** validation+finding+evidence

## Stage 08 — Segment behavior

- **id:** `segments` · **type:** exploration
- **investigation:** Segment retention or activation by plan (current or historical subscription) or early invite behavior. Save strongest segment evidence.
- **relevantTables:** `accounts`, `subscriptions`, `events`, `projects`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **findingPrompt:** Which segment difference is most actionable for product?
- **completion:** finding+evidence

## Stage 09 — Product recommendation

- **id:** `synthesis` · **type:** synthesis
- **investigation:** Recommend one product action supported by the strongest evidence; state non-causal limits.
- **findingPrompt:** What should product do next, and what would falsify your recommendation?
- **validation:** none · **completion:** finding only

## Stage 10 — Report

- **id:** `report` · **type:** report · **validation:** none · **completion:** finding required

---

# 08 — Payment Reconciliation & Account Integrity

- **id:** `payment-reconciliation`
- **Level:** Advanced
- **Role:** Financial Data Analyst / Analytics Engineer
- **Dataset:** `payments` (Payment Operations) · version `1`
- **Placement:** after advanced analytics / engineering

## Brief

| Field | Text |
| --- | --- |
| **who** | You support finance operations for payment integrity. |
| **situation** | Finance needs to know whether payment totals can be trusted and where lifecycle states fail to reconcile. |
| **ask** | Can finance trust the payment totals, and where are transactions failing to reconcile? |
| **data** | Payment Operations — authorization retries, settlements, partial refunds, and chargebacks. |
| **deliverable** | Reconciliation report with an investigation queue of unresolved exceptions—not just summary metrics. |

## Prerequisites

- multiple grains / fan-out prevention
- CTEs
- windows / running totals (capability)
- deduplication
- anti-joins / reconciliation
- state transitions

## Relevant tables

`accounts`, `merchants`, `authorizations`, `settlements`, `refunds`

## Metric definitions

- **Logical authorization** = distinct `request_key` (retries share request_key; prefer earliest `requested_at`, break ties with min `id`).
- **Approved** = logical auth with status approved (from chosen delivery).
- **Settlement** = posted debit referencing an authorization delivery id (`authorization_id`).
- **Refund / chargeback** = `refunds` credit; `reason` is `return` or `chargeback`. Represented once—do not double-count chargebacks elsewhere.
- **Posted balance movement** = settlements (debits) and refunds (credits) only. Authorizations are **not** ledger entries.
- **Unresolved exception examples:** approved logical request with no settlement; settlement amount ≠ authorized amount; refunds exceeding settlement; declined attempts incorrectly treated as money movement.
- Amounts are integer USD cents.

## Report template

| id | title | required | allowEvidence | prompt |
| --- | --- | --- | --- | --- |
| executive_summary | Executive summary | true | false | Can finance trust totals? |
| findings | Key findings | true | true | Lifecycle breaks and exposure. |
| investigation_queue | Investigation queue | true | true | Accounts/transactions requiring review. |
| recommendation | Controls recommendation | true | true | Process or data controls to prioritize. |
| limitations | Limitations | true | false | Synthetic ledger; no bank statements. |

---

## Stage 01 — Project brief

- **id:** `brief` · **type:** orientation · **validation:** none · **completion:** all false

## Stage 02 — Understand payment lifecycle

- **id:** `understand-data` · **type:** orientation
- **relevantTables:** `authorizations`, `settlements`, `refunds`, `accounts`, `merchants`
- **notes:** Retries share request_key. Settlement points at a delivery id. Multiple refunds per settlement allowed. Chargeback is a refund reason.
- **validation:** none · **completion:** all false

## Stage 03 — Establish transaction grain

- **id:** `transaction-grain` · **type:** exploration
- **investigation:** Demonstrate logical request grain vs delivery grain (deliveries per request_key, duplicate status checks). Save evidence proving your chosen grain.
- **relevantTables:** `authorizations`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **findingPrompt:** What grain will you use for reconciliation, and why?
- **completion:** finding+evidence

## Stage 04 — Authorization to settlement reconciliation

- **id:** `auth-settlement` · **type:** checkpoint
- **investigation:** At logical request grain for approved attempts, classify: settled_matched, approved_unsettled, amount_mismatch (if settled). Return counts by class.
- **relevantTables:** `authorizations`, `settlements`
- **expectedColumns:** `reconciliation_class`, `logical_requests`, `amount_cents_sum`
- **grain:** one row per reconciliation_class
- **validation:** checkpoint · ordered false · referenceId `payments-auth-settlement-classes`
  - invariants: dedupe request_key before classifying; declined excluded from approved classes; join settlements without multiplying retries incorrectly
- **hints:** (1) Collapse retries first. (2) Prevent fan-out when a request has multiple deliveries.
- **findingPrompt:** How large is the approved-but-unsettled population?
- **completion:** validation+finding+evidence

## Stage 05 — Refunds, reversals, chargebacks

- **id:** `refunds-chargebacks` · **type:** checkpoint
- **investigation:** Per settlement: settled amount, refunded amount, net posted, refund reason mix; flag settlements where refunds > settlement.
- **relevantTables:** `settlements`, `refunds`
- **expectedColumns:** `settlement_id`, `settled_cents`, `refunded_cents`, `net_posted_cents`, `over_refunded`
- **grain:** one row per settlement that has ≥1 refund OR is in the exception set defined by reference (reference returns all settlements with refunds plus any over-refunded)
- **validation:** checkpoint · ordered false · referenceId `payments-settlement-refunds`
  - invariants: sum refunds per settlement; over_refunded boolean; chargebacks included once in refunded_cents
- **findingPrompt:** Where do refunds and chargebacks create integrity risk?
- **completion:** validation+finding+evidence

## Stage 06 — Running account movement

- **id:** `running-balances` · **type:** exploration
- **investigation:** Build posted ledger movements (settlements as negative or debit, refunds as credit—document sign convention) and running balances for a sample of accounts. Save evidence.
- **relevantTables:** `accounts`, `settlements`, `refunds`, `authorizations`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **findingPrompt:** Does running movement look coherent, and where does it break?
- **completion:** finding+evidence

## Stage 07 — Detect unresolved exceptions

- **id:** `exceptions` · **type:** checkpoint
- **investigation:** Produce an exception queue: logical_request_key, account_id, exception_type, amount_cents, detected_at logic fields as needed.
- **relevantTables:** `authorizations`, `settlements`, `refunds`, `accounts`
- **expectedColumns:** `exception_type`, `account_id`, `request_key`, `amount_cents`
- **grain:** one row per unresolved exception instance
- **validation:** checkpoint · ordered false · referenceId `payments-exception-queue`
  - invariants: includes approved_unsettled and over_refunded at minimum; no duplicate exception rows for the same key+type
- **hints:** (1) Exceptions are findings to investigate, not rows to filter away. (2) Keep account identifiers for the queue.
- **findingPrompt:** What exception types dominate the queue?
- **completion:** validation+finding+evidence

## Stage 08 — Quantify financial exposure

- **id:** `exposure` · **type:** exploration
- **investigation:** Sum absolute or signed exposure by exception_type and merchant category. Save evidence.
- **relevantTables:** `authorizations`, `settlements`, `refunds`, `merchants`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **findingPrompt:** Where is financial exposure largest?
- **completion:** finding+evidence

## Stage 09 — Build investigation queue

- **id:** `synthesis` · **type:** synthesis
- **investigation:** Curate the priority investigation list for finance.
- **findingPrompt:** Which accounts/transactions should be investigated first and why?
- **validation:** none · **completion:** finding only

## Stage 10 — Reconciliation report

- **id:** `report` · **type:** report · **validation:** none · **completion:** finding required

---

# 09 — Delivery Network Reliability

- **id:** `delivery-network-reliability`
- **Level:** Advanced
- **Role:** Supply Chain Data Analyst
- **Dataset:** `logistics` (Parcel Network) · version `1`
- **Placement:** after event/state analysis

## Brief

| Field | Text |
| --- | --- |
| **who** | You analyze a multi-hub parcel network. |
| **situation** | Shipments miss SLA and tracking looks inconsistent. Leadership needs where the network breaks down. |
| **ask** | Where is the delivery network breaking down, and why are shipments missing SLA? |
| **data** | Parcel Network — multi-package shipments, duplicate scans, missing transitions, late ingestion. |
| **deliverable** | Reliability report with a priority exception queue for warehouse/carrier investigation. |

## Prerequisites

- event deduplication
- event sequencing
- windows / lag-lead capability (do not name)
- gaps / missing states
- date differences
- CTEs
- conditional aggregation

## Relevant tables

`warehouses`, `carriers`, `shipments`, `packages`, `tracking_events`

## Metric definitions

- **Logical scan** = distinct `scan_key` (duplicate deliveries share scan_key). Physical order uses `occurred_at`; `ingested_at` is information arrival.
- **Package delivered** = package has a delivered logical scan.
- **Shipment delivered** = **every** package in the shipment is delivered.
- **SLA miss** = shipment delivered after `promised_at`, OR not fully delivered by analysis horizon with promised_at in the past (reference locks horizon = max occurred_at in edition).
- **Missing in-transit** = delivered (or later) without a prior in_transit logical scan (absence is not proof the physical event never happened—treat as data exception).
- Status values: `accepted`, `in_transit`, `rerouted`, `failed_attempt`, `delivered`.

## Report template

| id | title | required | allowEvidence | prompt |
| --- | --- | --- | --- | --- |
| executive_summary | Executive summary | true | false | Where the network fails SLA. |
| findings | Key findings | true | true | Validation, journeys, SLA, bottlenecks. |
| exception_queue | Priority exception queue | true | true | Highest-impact failures to investigate. |
| recommendation | Network recommendation | true | true | Carrier/warehouse/process priorities. |
| limitations | Limitations | true | false | Missing scans ≠ proof; synthetic network. |

---

## Stage 01 — Project brief

- **id:** `brief` · **type:** orientation · **validation:** none · **completion:** all false

## Stage 02 — Understand shipment and event model

- **id:** `understand-data` · **type:** orientation
- **relevantTables:** `shipments`, `packages`, `tracking_events`, `warehouses`, `carriers`
- **notes:** Multi-package shipments. Duplicate scan_key. Partial completion possible. Delivery deadline is inclusive promised_at.
- **validation:** none · **completion:** all false

## Stage 03 — Validate tracking stream

- **id:** `validate-tracking` · **type:** checkpoint
- **investigation:** Quantify duplicate scan deliveries, late ingestion (ingested long after occurred), and packages missing in_transit before delivered.
- **relevantTables:** `tracking_events`, `packages`
- **expectedColumns:** `event_deliveries`, `logical_scans`, `duplicate_extra_rows`, `late_ingestions`, `packages_missing_in_transit`
- **grain:** one summary row
- **validation:** checkpoint · ordered false · referenceId `logistics-tracking-quality`
  - invariants: logical_scans = distinct scan_key; duplicates = deliveries − logical_scans; missing in_transit rule as defined
- **hints:** (1) Deduplicate before sequencing. (2) Separate occurred_at from ingested_at.
- **findingPrompt:** Which tracking quality issues will distort SLA analysis if ignored?
- **completion:** validation+finding+evidence

## Stage 04 — Reconstruct journeys

- **id:** `reconstruct-journeys` · **type:** exploration
- **investigation:** For a sample of packages, reconstruct ordered logical statuses by occurred_at. Save examples of healthy vs broken sequences.
- **relevantTables:** `tracking_events`, `packages`, `shipments`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **findingPrompt:** What sequence failures appear most often?
- **completion:** finding+evidence

## Stage 05 — Measure stage durations

- **id:** `stage-durations` · **type:** exploration
- **investigation:** Estimate time from accepted → delivered (or accepted → in_transit) by carrier or origin hub. Save comparative evidence.
- **relevantTables:** `tracking_events`, `packages`, `shipments`, `carriers`, `warehouses`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **findingPrompt:** Which legs of the journey consume the most time?
- **completion:** finding+evidence

## Stage 06 — Analyze SLA failures

- **id:** `sla` · **type:** checkpoint
- **investigation:** At shipment grain, determine full delivery and SLA miss, then summarize by carrier.
- **relevantTables:** `shipments`, `packages`, `tracking_events`, `carriers`, `warehouses`
- **expectedColumns:** `carrier`, `shipments`, `delivered_shipments`, `sla_miss_rate`
- **grain:** one row per carrier
- **validation:** checkpoint · ordered false · referenceId `logistics-sla-by-carrier`
  - invariants: shipment delivered iff all packages delivered; sla_miss per metric definitions; rates use shipment denominator
- **hints:** (1) Complete shipment delivery is relational division across packages. (2) Deduplicate delivered scans first.
- **findingPrompt:** Which carriers miss SLA most relative to volume?
- **completion:** validation+finding+evidence

## Stage 07 — Detect missing or invalid transitions

- **id:** `missing-transitions` · **type:** checkpoint
- **investigation:** List packages that are delivered without accepted, or delivered without in_transit (data exceptions).
- **relevantTables:** `tracking_events`, `packages`
- **expectedColumns:** `package_id`, `shipment_id`, `exception_type`
- **grain:** one row per package exception
- **validation:** checkpoint · ordered false · referenceId `logistics-transition-exceptions`
- **hints:** (1) Work on logical scans. (2) Exception types should be explicit strings.
- **findingPrompt:** How widespread are invalid journeys vs true late deliveries?
- **completion:** validation+finding+evidence

## Stage 08 — Warehouse and carrier bottlenecks

- **id:** `bottlenecks` · **type:** exploration
- **investigation:** Compare SLA misses and failed_attempt rates by origin warehouse, destination, and carrier. Save highest-impact slices.
- **relevantTables:** `shipments`, `packages`, `tracking_events`, `warehouses`, `carriers`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **findingPrompt:** Where should network operations intervene first?
- **completion:** finding+evidence

## Stage 09 — Priority exception queue

- **id:** `synthesis` · **type:** synthesis
- **investigation:** Build the priority action queue narrative from evidence.
- **findingPrompt:** List the highest-impact failures to investigate this week.
- **validation:** none · **completion:** finding only

## Stage 10 — Reliability report

- **id:** `report` · **type:** report · **validation:** none · **completion:** finding required

---

# 10 — Build a Trusted Retail Warehouse

- **id:** `trusted-retail-warehouse`
- **Level:** Advanced (capstone)
- **Role:** Analytics Engineer / Data Engineer
- **Dataset:** `retail` (Online Retail) · version `1`
- **Placement:** after Database Engineering + Warehouse lessons

## Brief

| Field | Text |
| --- | --- |
| **who** | You are an analytics engineer turning commerce extracts into a trusted warehouse. |
| **situation** | Analysts cannot rely on raw invoice extracts for repeatable reporting. Leadership wants a curated model. |
| **ask** | Turn raw commerce records into a trusted analytical warehouse that supports repeatable reporting. |
| **data** | Online Retail — same canonical retail source as Project 01; engineering focus on modeling, not narrative sales insights alone. |
| **deliverable** | Staging → dimensions → fact → history → incremental load → quality checks → reconciliation → reporting views, plus an engineering handoff. |

## Prerequisites

- DDL / DML
- CTEs
- validation / dedupe
- constraints / keys
- fact/dimension modeling
- SCD concepts
- incremental / idempotent loads
- reconciliation

## Relevant tables (source)

`countries`, `customers`, `products`, `orders`, `order_items`

Target artifacts are learner-built (`stg_*`, `dim_*`, `fact_*`, views)—exact names locked below.

## Metric / modeling definitions

- **Header grain** = `orders.id` (not source invoice string alone).
- **Line grain** = `order_items.source_row`.
- **fact_sales grain** = one row per order line (`source_row`) with degenerate/header foreign keys; measures include `quantity`, `unit_price_gbp`, `line_value_gbp = quantity * unit_price_gbp`.
- **dim_customer** includes anonymous-capable key strategy: either exclude NULL customers from the dimension and keep NULL FK on fact, or a dedicated anonymous member—**reference locks NULL FK allowed on fact, no invented person**.
- **dim_product** keyed by `stock_code`.
- **dim_date** derived from `invoice_at` calendar date (`substr(invoice_at,1,10)`).
- **SCD Type 2** applies to product description history if implemented; minimum bar is current-type dim_product plus documented limitation if Type 2 deferred—capstone stages require Type 2 for product description changes observed on lines vs products table **or** an explicit validated current snapshot plus `dim_product_history` table (reference requires `dim_product` with `stock_code` PK and `dim_date`).
- **Incremental / replay-safe:** re-running the load must not duplicate fact rows (use delete+insert by watermark or merge-by-key).
- **Reconcile:** sum(fact line_value) matches sum(source line_value) for loaded scope.

## Report template

| id | title | required | allowEvidence | prompt |
| --- | --- | --- | --- | --- |
| executive_summary | Engineering summary | true | false | What trusted layer you delivered. |
| model | Model overview | true | true | Grains, keys, SCD choices. |
| quality | Quality and reconciliation | true | true | Checks passed and remaining risks. |
| handoff | Engineering handoff | true | true | How to run, replay, and extend the load. |
| limitations | Limitations | true | false | Source quirks not solved by the model. |

---

## Stage 01 — Project brief

- **id:** `brief` · **type:** orientation · **validation:** none · **completion:** all false

## Stage 02 — Inspect raw sources

- **id:** `inspect-raw` · **type:** exploration
- **investigation:** Profile invalid/odd records: NULL customers, cancelled headers, negative quantities, duplicate source patterns, conflicting invoice headers. Save profiling evidence.
- **relevantTables:** `orders`, `order_items`, `customers`, `products`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **findingPrompt:** Which source defects must staging address?
- **completion:** finding+evidence

## Stage 03 — Define grain and contracts

- **id:** `define-contracts` · **type:** synthesis
- **investigation:** Write the contracts: header grain, line grain, fact grain, key strategy for anonymous customers, and cancellation handling in facts (retain lines; attributes carry cancelled flag).
- **findingPrompt:** State grains and contracts you will implement.
- **validation:** none · **completion:** finding only

## Stage 04 — Build staging

- **id:** `build-staging` · **type:** build
- **investigation:** Create typed staging tables `stg_orders` and `stg_order_items` populated from source with explicit casts/trims as needed.
- **relevantTables:** `orders`, `order_items`
- **expectedEvidence:** staging tables exist with row counts matching source scope
- **validation:**
  - kind: checkpoint
  - expectedColumns: `[table_name, row_count]`
  - grain: one row per staging table
  - ordered: false
  - referenceId: `retail-wh-staging-counts`
  - invariants: `stg_orders` count = orders; `stg_order_items` count = order_items
- **hints:** (1) Preserve source keys. (2) Do not drop cancellations in staging.
- **findingPrompt:** Confirm staging row counts and any rejected rows.
- **completion:** validation+finding+evidence

## Stage 05 — Clean and deduplicate

- **id:** `clean-dedupe` · **type:** build
- **investigation:** Produce trusted entity tables for customers and products used by dimensions (document how duplicate descriptions are handled).
- **relevantTables:** `customers`, `products`, `order_items`
- **validation:** `{ kind: "exploration", minimumEvidence: 1 }`
- **findingPrompt:** What dedupe rules did you apply?
- **completion:** finding+evidence

## Stage 06 — Build dimensions

- **id:** `build-dimensions` · **type:** build
- **investigation:** Create `dim_customer`, `dim_product`, and `dim_date` with declared keys.
- **relevantTables:** `customers`, `products`, `orders`
- **validation:**
  - kind: checkpoint
  - expectedColumns: `[dimension, row_count]`
  - grain: one row per dimension name among `dim_customer`, `dim_product`, `dim_date`
  - ordered: false
  - referenceId: `retail-wh-dim-counts`
  - invariants: dim_product PK stock_code; dim_date covers all distinct invoice dates in scope; dim_customer has no NULL id rows
- **hints:** (1) Build dim_date from distinct invoice dates. (2) Keep anonymous purchases out of dim_customer.
- **findingPrompt:** Are dimension keys stable and complete for the fact grain?
- **completion:** validation+finding+evidence

## Stage 07 — Build fact table

- **id:** `build-fact` · **type:** build
- **investigation:** Create `fact_sales` at line grain with keys to dimensions and `line_value_gbp`.
- **relevantTables:** `stg_order_items`, `stg_orders`, dimensions
- **validation:**
  - kind: checkpoint
  - expectedColumns: `[fact_rows, net_line_value_gbp]`
  - grain: one summary row
  - ordered: false
  - referenceId: `retail-wh-fact-summary`
  - invariants: fact_rows = order_items rows in scope; net_line_value matches source sum(quantity*unit_price_gbp)
- **hints:** (1) Protect line grain—no accidental fan-out. (2) Preserve signs on line_value.
- **findingPrompt:** Does fact grain match the contract?
- **completion:** validation+finding+evidence

## Stage 08 — Implement history

- **id:** `implement-history` · **type:** build
- **investigation:** Implement product description history (SCD2-style `dim_product_hist` with valid_from/valid_to) **or** document and build `dim_product_hist` from distinct (stock_code, description) observations on lines with effective dating rule locked in reference.
- **validation:**
  - kind: checkpoint
  - expectedColumns: `[stock_code, versions]`
  - grain: one row per stock_code that has >1 distinct non-null description in order_items (may be empty)
  - ordered: false
  - referenceId: `retail-wh-product-hist-multi`
  - invariants: history table exists; multi-description codes have versions ≥ 2
- **hints:** (1) Line descriptions can differ from products.description. (2) Half-open validity intervals preferred.
- **findingPrompt:** How will analysts know which description applied when?
- **completion:** validation+finding+evidence

## Stage 09 — Build incremental replay-safe load

- **id:** `incremental-load` · **type:** build
- **investigation:** Implement a load script/pattern that can re-run without duplicating `fact_sales` (e.g. wipe watermark slice then reload). Demonstrate idempotency with evidence (row count unchanged after second run).
- **validation:**
  - kind: checkpoint
  - expectedColumns: `[run_id, fact_rows]`
  - grain: one row per run (run_id 1 and 2)
  - ordered: true
  - referenceId: `retail-wh-idempotent-runs`
  - invariants: fact_rows equal across both runs
- **hints:** (1) Idempotency is required. (2) Prefer keyed delete/reload over blind insert.
- **findingPrompt:** Prove a second run does not duplicate facts.
- **completion:** validation+finding+evidence

## Stage 10 — Add quality checks

- **id:** `quality-checks` · **type:** build
- **investigation:** Create a `warehouse_quality_checks` result set: check_name, passed (0/1), observed_value.
- **Minimum checks:** orphan fact product keys = 0; orphan fact order keys = 0; fact net value reconciles to source; duplicate fact source_row = 0.
- **validation:**
  - kind: checkpoint
  - expectedColumns: `[check_name, passed, observed_value]`
  - grain: one row per check
  - ordered: false
  - referenceId: `retail-wh-quality-checks`
- **hints:** (1) Failed checks should stay visible. (2) Name checks explicitly.
- **findingPrompt:** Which checks are green, and which risks remain?
- **completion:** validation+finding+evidence

## Stage 11 — Reconcile

- **id:** `reconcile` · **type:** checkpoint
- **investigation:** Publish source vs warehouse totals: orders, lines, net_gbp, positive_gbp, negative_gbp.
- **expectedColumns:** `metric`, `source_value`, `warehouse_value`, `difference`
- **grain:** one row per metric
- **validation:** checkpoint · ordered false · referenceId `retail-wh-reconcile`
  - invariants: differences are 0 for all metrics in scope
- **findingPrompt:** Is the warehouse reconciled to source for the loaded scope?
- **completion:** validation+finding+evidence

## Stage 12 — Publish reporting layer

- **id:** `publish-reporting` · **type:** build
- **investigation:** Create view `v_sales_monthly` (month, order_headers, net_gbp, positive_gbp) on top of the warehouse.
- **validation:**
  - kind: checkpoint
  - expectedColumns: `[month, order_headers, net_gbp, positive_gbp]`
  - grain: one row per month
  - ordered: true
  - referenceId: `retail-wh-v-sales-monthly`
- **hints:** (1) Read from fact/dims, not raw only. (2) Month formatting YYYY-MM.
- **findingPrompt:** Can an analyst use the view without touching raw extracts?
- **completion:** validation+finding+evidence

## Stage 13 — Engineering handoff

- **id:** `report` · **type:** report
- **investigation:** Complete engineering handoff: how to run, replay, extend, and which limitations remain.
- **validation:** none · **completion:** finding required

---

# Manifest checklist

| # | id | Level | Stages | Checkpoint-heavy? |
| ---: | --- | --- | --- | --- |
| 1 | retail-performance-review | Beginner | 8 | yes |
| 2 | airline-reliability-review | Beginner | 8 | yes |
| 3 | urban-mobility-demand | Beginner | 8 | yes |
| 4 | healthcare-operations | Intermediate | 9 | mixed |
| 5 | grid-demand-generation | Intermediate | 9 | mixed |
| 6 | engineering-delivery-performance | Intermediate | 9 | mixed |
| 7 | saas-activation-retention | Intermediate | 10 | mixed |
| 8 | payment-reconciliation | Advanced | 10 | exploration+checkpoint |
| 9 | delivery-network-reliability | Advanced | 10 | exploration+checkpoint |
| 10 | trusted-retail-warehouse | Advanced | 13 | build+checkpoint |

**Total stages:** 8+8+8+9+9+9+10+10+10+13 = **94**

Implemented: `Project[]` content modules, single-column workspace UI, reference SQL keyed by `referenceId`, evidence persistence, and full route cutover to `/sql/projects` (old guided + library investigation URLs redirect).
