# Video Product Analytics

_Draft report_

Move from watch events to daily engagement, rolling trends, and signup-cohort retention.

- Sample database: Streamly (viewers, videos, watch_events, daily_metrics)
- Milestones completed (SQL + concept check): 0 of 4
- Findings written: 1 of 4
- Verified checks (Check answer passed): 1
- Exported: 2026-10-12T16:48:53.680Z

Findings are the learner’s own interpretation. Passing a SQL check does not verify the written finding.

## Incomplete for a complete report

- Complete milestone SQL + concept check: Daily active users & engagement
- Complete milestone SQL + concept check: Rolling averages & missing dates
- Complete milestone SQL + concept check: Cohorts & exact-day retention
- Complete milestone SQL + concept check: Top N per group & ties

## Milestone 1: Daily active users & engagement

Status: In progress

**Findings**

Daily active viewers vary by day in the sample. Weekend peaks support prioritizing weekend content slots.

### 1.1 Return day (YYYY-MM-DD) and active_viewers (distinct viewers) for every observed watch date.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
SELECT date(watched_at) AS day,COUNT(DISTINCT viewer_id) AS active_viewers FROM watch_events GROUP BY day
```

| day | active_viewers |
| --- | --- |
| 2025-01-01 | 1 |
| 2025-01-02 | 3 |
| 2025-01-03 | 2 |
| 2025-01-04 | 3 |
| 2025-01-05 | 1 |
| 2025-01-06 | 3 |
| 2025-01-07 | 2 |
| 2025-01-08 | 1 |
| 2025-01-09 | 1 |
| 2025-01-10 | 2 |
| 2025-01-11 | 1 |
| 2025-01-12 | 1 |
| 2025-01-15 | 1 |
| 2025-02-01 | 1 |

### 1.2 Return day, active_viewers and minutes_per_active_viewer, rounded to 2 decimals, for each observed watch date.

_not attempted_

## Milestone 2: Rolling averages & missing dates

Status: Not started

_No finding written yet._

### 2.1 Return day, watch_minutes and rolling_avg (2 decimals) for the current and previous 2 observed rows in daily_metrics, sorted by day. This task intentionally uses rows, not calendar days.

_not attempted_

### 2.2 Return day, watch_minutes and rolling_avg (2 decimals) for every day Jan 1–7 2025, treating absent daily_metrics days as zero. Average current and previous 2 calendar days; early windows use available days. Sort by day.

_not attempted_

## Milestone 3: Cohorts & exact-day retention

Status: Not started

_No finding written yet._

### 3.1 With observation cutoff Jan 15 2025, return cohort_day, cohort_size, retained_viewers and retention_pct (0–100, 2 decimals) for exact-day D1 retention. Include only mature cohorts.

_not attempted_

### 3.2 Use the same output and cutoff for exact-day D7 retention (signup date +7 days); include only mature cohorts.

_not attempted_

## Milestone 4: Top N per group & ties

Status: Not started

_No finding written yet._

### 4.1 Return creator_id, video_id and watch_seconds for the top 2 watched videos per creator, excluding videos with no events. Rank by total seconds descending, break ties by smallest video_id.

_not attempted_

### 4.2 Return creator_id, video_id and watch_seconds for each creator's most-watched video(s), including ties. Exclude videos with no events.

_not attempted_
