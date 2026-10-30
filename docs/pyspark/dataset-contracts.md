# PySpark cross-dataset contracts

Three projects join two datasets each: **P06** (PS-D07 taxi + PS-D13 weather), **P09** (PS-D06 clickstream + PS-D12
ads) and **P10** (PS-D09 IoT + PS-D15 application logs). This file is the business agreement between each pair: which
keys mean the same thing, how time lines up, and which editions overlap. The generators implement it and the manifests'
`rules` state it in learner words; if they ever disagree, fix the generator and this file together.

Based on `PySpark Docs/instructions/PROJECTS_10_v4.md` (P06 "join zone and weather by time/geo rules", P09
"attribution-window definitions", P10 "incident correlation").

## 0. Ground rules

- **Only project editions are joinable across datasets.** Lesson and practice editions were written for single-dataset
  lessons and stay as they are (byte-identical across versions); their ids and dates don't line up across datasets and
  no content should join them. Project steps (`PS-Pnn-Mk`) pin the versions listed below.
- Versions: P06 = PS-D07 **1.0.0** + PS-D13 **1.1.0**; P09 = PS-D06 **1.1.0** + PS-D12 **1.1.0**; P10 = PS-D09
  **1.0.0** + PS-D15 **1.1.0**. In each new version only the project edition changed; lesson and practice files are
  identical to 1.0.0, so content pinned to 1.0.0 is unaffected and could be repointed without rebuilding.
- Deliberate data problems (duplicates, gaps, late data, unknown ids) stay; the contract says how each must be treated.

## 1. P06 — taxi trips × weather (PS-D07 1.0.0 + PS-D13 1.1.0)

**Business relationship.** Kestrel Bay (PS-D07's invented city) has one official hourly weather station: PS-D13
`NYC-01` "Harbor Point Station", which stands in taxi zone 10 (Harbor Point). Weather is city-wide: **every zone maps
to NYC-01**, airports (zones 1–3) included. The other D13 stations are elsewhere and never join to trips.

| zone_id | borough | station |
|---|---|---|
| 1–3 | Airport | NYC-01 |
| 4–30 | Old Quarter, Northbank, Riverside, Eastfield, Outer Ring | NYC-01 |
| 0, 99 (project only, not in `taxi_zones`) | — | NYC-01 for weather; still unknown zones for zone metrics |

**Time zone and grain.**
- PS-D07 `pickup_at` / `dropoff_at` are **local wall-clock time, America/New_York** (the station's zone). PS-D13
  `observed_at` is **UTC**. In the project period (May 2026) New York is on EDT, UTC−4; there is no clock change in it.
- NYC-01 reports hourly on the hour; a reading at `observed_at` T describes the hour **ending** at T (precipitation is
  the rain in that hour).
- A trip takes the reading of the hour it started in:
  `observed_at = date_trunc('hour', to_utc_timestamp(pickup_at, 'America/New_York')) + INTERVAL 1 HOUR`, station NYC-01.
- In D13 1.1.0's project edition, NYC-01's `temperature_c`, `precipitation_mm` and `wind_speed_kph` for each hour of the
  taxi period equal PS-D07 project `weather_enrichment` for the same local hour (obs_date = to_date(pickup_at), obs_hour
  = hour(pickup_at)), except readings hit by D13's documented problems. So both routes give the same weather.

**Windows.**

| edition | PS-D07 trips (local) | PS-D13 observations (UTC) | joinable |
|---|---|---|---|
| lesson | 2026-04-07 07:00–12:30 | 2026-03-07/08 | no |
| practice | 2026-04-06 – 04-19 | 2026-03-01 – 03-14 | no |
| project | 2026-05-04 00:00 – 05-24 23:59 | 2026-05-03 – 05-25 (NYC-01 hourly) | **yes** |

**Problems a P06 join must handle.** D13 project: NYC-01 has 12 missing hours inside the taxi period (those trips get no
weather — keep them, with null weather); ~1% duplicate readings (same station and observed_at, new observation_id —
deduplicate before joining or trips double); null / NaN / −9999 values; a few impossible values flagged ok. D07 project:
dropoff before pickup, zero distance, negative fares, zones 0/99 (the weather join doesn't depend on them).

## 2. P09 — clickstream × ads (PS-D06 1.1.0 + PS-D12 1.1.0)

**Business relationship.** PS-D12 is the ad platform; PS-D06 is the shop's site. An ad click (D12 `clicks`) lands the
user on the site and starts a session (D06 `sessions`) whose `campaign_id` (and `page_views.context.utm.campaign`) is
the clicked campaign. In the project editions:
- **Users:** D06 signed-in `user_id`s are D12 user ids (`U00001` … `U00480`). Anonymous sessions (`user_id` null) cannot
  be matched to a person; they still count for their campaign through `campaign_id`.
- **Campaigns:** D06 `campaign_id` is always a D12 campaign that was running that day (start_date ≤ day ≤ end_date), and
  `traffic_source` follows the campaign's channel: search → `search_ads`, social → `social`, display → `display`,
  video → `video`, email → `email`. `affiliate` and organic sources never carry a campaign in the project edition.
- **Click → session (landing):** a click matches a session when `user_id` and `campaign_id` are equal and
  `clicks.event_time ≤ sessions.started_at ≤ clicks.event_time + 30 minutes`. Every D06 project campaign session has
  exactly one such landing click in D12 (5–90 s before `started_at`); if several clicks qualify, the latest wins.
- **Attribution window (click/conversion vs session):** an order (D06 `checkout_events` step `complete`, `order_id`
  set) is attributed to the session's landing click when `complete.event_time ≤ click.event_time +
  attribution_window_days` of the click's campaign (D12 `campaigns`). D12 also records each such order as a
  `conversions` row (`click_id` = the landing click, `conversion_type` purchase, `converted_at` = the complete event's
  time, `revenue` = `order_total`), so both sides agree.
- Event-time vs arrival-time: attribution and sessionisation use `event_time`; `arrival_time`/`batch` only decide when a
  record is seen (late data, watermarks). Duplicated deliveries (D06 event_id, D12 click_id) are deduplicated first.
- All times are UTC in both datasets.

**Windows.**

| edition | PS-D06 | PS-D12 | joinable |
|---|---|---|---|
| lesson | 2026-03-14 10:00–10:50, CU-001… users, CMP-0007/0012 | 2026-03-02/03, campaigns CMP-0001–0004, U0000n users | no |
| practice | 2026-03-14 08:00–18:00, CU-0001… users | 2026-03-02 – 03-08 | no |
| project | **2026-03-05 08:00–18:00**, users U00001–U00480 | 2026-03-02 – 03-08, users U00001–U01100 | **yes** |

**Problems a P09 join must handle.** D06 project: late events (some beyond a 2-hour watermark), duplicate deliveries,
sessions with no page view. D12 project: clicks whose impression was lost, duplicate clicks, ~7% of the platform's own
random conversions outside their window (never attributed). Landing conversions are never moved outside the window.

## 3. P10 — IoT sensors × application logs (PS-D09 1.0.0 + PS-D15 1.1.0)

**Business relationship.** Every PS-D09 sensor talks to the platform through one application service, PS-D15
`iot-gateway` (telemetry uploads and status calls). No other service carries a device. In the project editions:
- **Device ids:** `error_events.device_id`, `application_logs.attributes['device_id']` and the device behind every
  `iot-gateway` request are PS-D09 project devices, format `DEV-NNN` (`DEV-001` … `DEV-018`).
- **Log incident → device:** an error event belongs to the device in `device_id`; it correlates with that device's
  readings when `|error.occurred_at − reading.event_time| ≤ 15 minutes` (readings come every 15 minutes) and with its
  maintenance visit when `started_at ≤ occurred_at ≤ ended_at`.
- Built-in correlations (all within the D15 window):
  - `HeartbeatMissed` (warning, no request): one per D09 maintenance visit, at `started_at + 10 minutes` — the sensor is
    silent while it is serviced.
  - `OutOfRangeReading` (warning, no request): one per D09 glitch reading (temperature_c 999.0 or humidity_pct 255.0),
    at the reading's first `arrival_time`; it is the gateway's side of the false TEMP_CRIT / HUM_HIGH alerts.
  - Gateway request errors (TelemetryRejected, DeviceAuthFailed, ClockSkew, PayloadTooLarge) name a device that is not
    under maintenance at that moment.
- Time: both datasets are UTC (D09's timestamps are UTC; the sensors' site is irrelevant to the join).

**Windows.**

| edition | PS-D09 | PS-D15 | joinable |
|---|---|---|---|
| lesson | 2026-04-14 09:00–09:52, DEV-001…004 | 2026-04-14 10:00–10:02, DEV-0001…0003 | no |
| practice | 2026-04-20 – 04-21, DEV-001…012 | 2026-04-14 10:00–16:00, DEV-0001…0050 | no |
| project | 2026-05-11 00:00 – 05-14 00:00, DEV-001…018 | **2026-05-12 00:00 – 05-13 00:00**, DEV-001…018 | **yes** |

**Problems a P10 join must handle.** D09 project: late and duplicated readings (deduplicate on reading_id before
counting), glitches, missing payload fields. D15 project: duplicated log records, malformed raw lines, abandoned (499)
requests with null latency.

## 4. Verification

Plain-Python checks (no Spark) live with the fix in the session scratchpad; the counts they produced are recorded in
`docs/pyspark/NEXT_SESSION.md` §5. Re-check after any generator change: parse every file against the manifest DDL, PK/FK
as the rules say, and the three joins above.
