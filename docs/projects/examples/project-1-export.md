# Social Product Analytics

_Draft report_

Clean event retries, reconstruct ordered funnels, sessionize activity, and compare experiment conversions.

- Sample database: SocialLoop (members, social_events, experiment_assignments)
- Milestones completed (SQL + concept check): 2 of 4
- Findings written: 2 of 4
- Verified checks (Check answer passed): 4
- Exported: 2026-10-12T16:32:54.952Z

Findings are the learner’s own interpretation. Passing a SQL check does not verify the written finding.

## Incomplete for a complete report

- Complete milestone SQL + concept check: Sessionize an event stream
- Complete milestone SQL + concept check: Experiment conversion denominators

## Milestone 1: Deduplicate event retries

Status: Completed · concept check passed

**Findings**

Validated the business result against the sample and changed data.

### 1.1 Return id, event_key and member_id for the latest ingested row of each event_key. Break ingestion ties by highest id.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
WITH ranked AS(SELECT *,ROW_NUMBER() OVER(PARTITION BY event_key ORDER BY ingested_at DESC,id DESC) AS rn FROM social_events) SELECT id,event_key,member_id FROM ranked WHERE rn=1
```

| id | event_key | member_id |
| --- | --- | --- |
| 4 | a | 1 |
| 2 | b | 1 |
| 3 | c | 1 |
| 5 | d | 2 |
| 6 | e | 2 |
| 7 | f | 3 |
| 8 | g | 3 |
| 9 | h | 3 |
| 10 | i | 3 |
| 11 | j | 4 |
| 12 | k | 1 |
| 13 | l | 1 |
| 14 | m | 5 |
| 15 | n | 5 |
| 16 | o | 5 |
| 17 | p | 6 |
| 18 | q | 6 |
| 19 | r | 6 |
| 20 | s | 7 |
| 21 | t | 2 |
| 22 | u | 1 |

### 1.2 After keeping the latest ingested row per event_key (tie: highest id), return event_type and event_count by event_type.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
WITH ranked AS(SELECT *,ROW_NUMBER() OVER(PARTITION BY event_key ORDER BY ingested_at DESC,id DESC) AS rn FROM social_events) SELECT event_type,COUNT(*) AS event_count FROM ranked WHERE rn=1 GROUP BY event_type
```

| event_type | event_count |
| --- | --- |
| like | 1 |
| purchase | 6 |
| signup | 5 |
| view | 9 |

## Milestone 2: Ordered conversion funnels

Status: Completed · concept check passed

**Findings**

Validated the business result against the sample and changed data.

### 2.1 Return one row: viewed, signed_up, purchased as member counts for the ordered view → signup → purchase funnel. Equal times are allowed; use each member's earliest valid next step.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
WITH views AS(SELECT member_id,MIN(event_at) AS viewed_at FROM social_events WHERE event_type='view' GROUP BY member_id), signups AS(SELECT v.member_id,v.viewed_at,MIN(e.event_at) AS signed_at FROM views v LEFT JOIN social_events e ON e.member_id=v.member_id AND e.event_type='signup' AND e.event_at>=v.viewed_at GROUP BY v.member_id,v.viewed_at), funnel AS(SELECT s.member_id,s.viewed_at,s.signed_at,MIN(e.event_at) AS purchased_at FROM signups s LEFT JOIN social_events e ON e.member_id=s.member_id AND e.event_type='purchase' AND e.event_at>=s.signed_at GROUP BY s.member_id,s.viewed_at,s.signed_at) SELECT COUNT(*) AS viewed,COUNT(signed_at) AS signed_up,COUNT(purchased_at) AS purchased FROM funnel
```

| viewed | signed_up | purchased |
| --- | --- | --- |
| 7 | 5 | 5 |

### 2.2 Return member_id, viewed_at, signed_at and purchased_at for members who complete that ordered funnel.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
WITH views AS(SELECT member_id,MIN(event_at) AS viewed_at FROM social_events WHERE event_type='view' GROUP BY member_id), signups AS(SELECT v.member_id,v.viewed_at,MIN(e.event_at) AS signed_at FROM views v LEFT JOIN social_events e ON e.member_id=v.member_id AND e.event_type='signup' AND e.event_at>=v.viewed_at GROUP BY v.member_id,v.viewed_at), funnel AS(SELECT s.member_id,s.viewed_at,s.signed_at,MIN(e.event_at) AS purchased_at FROM signups s LEFT JOIN social_events e ON e.member_id=s.member_id AND e.event_type='purchase' AND e.event_at>=s.signed_at GROUP BY s.member_id,s.viewed_at,s.signed_at) SELECT member_id,viewed_at,signed_at,purchased_at FROM funnel WHERE purchased_at IS NOT NULL
```

| member_id | viewed_at | signed_at | purchased_at |
| --- | --- | --- | --- |
| 1 | 2025-01-01 10:00:00 | 2025-01-01 10:03:00 | 2025-01-01 10:05:00 |
| 2 | 2025-01-02 09:00:00 | 2025-01-02 09:10:00 | 2025-01-08 11:00:00 |
| 3 | 2025-01-03 09:00:00 | 2025-01-03 09:10:00 | 2025-01-03 09:15:00 |
| 5 | 2025-01-05 11:00:00 | 2025-01-05 11:20:00 | 2025-01-05 11:40:00 |
| 6 | 2025-01-06 12:00:00 | 2025-01-06 12:05:00 | 2025-01-06 12:20:00 |

## Milestone 3: Sessionize an event stream

Status: Not started

_No finding written yet._

### 3.1 Using raw social_events, return member_id and session_count. Start a new session on the first event or a gap of at least 30 minutes; order by event_at then id per member.

_not attempted_

### 3.2 Using the same rule, return id, member_id and session_number for every raw social event.

_not attempted_

## Milestone 4: Experiment conversion denominators

Status: Not started

_No finding written yet._

### 4.1 Return variant, assigned, converted and conversion_pct (0–100, 2 decimals). A member converts with any purchase on/after assigned_at and before Feb 1 2025. Include all assigned members.

_not attempted_

### 4.2 Return member_id, variant and converted (1 or 0) for every assignment using the same post-assignment purchase definition and cutoff.

_not attempted_
