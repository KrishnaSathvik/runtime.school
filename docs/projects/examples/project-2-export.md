# AI Platform Economics

_Draft report_

Calculate success rates and usage costs, prevent join fan-out, and reconcile split payments with refunds.

- Sample database: ModelWorks (ai_accounts, ai_requests, model_rates, invoices, payments, refunds)
- Milestones completed (SQL + concept check): 2 of 4
- Findings written: 2 of 4
- Verified checks (Check answer passed): 4
- Exported: 2026-10-12T16:32:56.724Z

Findings are the learner’s own interpretation. Passing a SQL check does not verify the written finding.

## Incomplete for a complete report

- Complete milestone SQL + concept check: Revenue & payment reconciliation
- Complete milestone SQL + concept check: AI usage cost & contribution margin

## Milestone 1: Ratios, ROUND & NULLIF

Status: Completed · concept check passed

**Findings**

Validated the business result against the sample and changed data.

### 1.1 Return account_id and success_pct (0–100, rounded to 2 decimals) for accounts with requests.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
SELECT account_id,ROUND(100.0*SUM(CASE WHEN status='success' THEN 1 ELSE 0 END)/NULLIF(COUNT(*),0),2) AS success_pct FROM ai_requests GROUP BY account_id
```

| account_id | success_pct |
| --- | --- |
| 1 | 75 |
| 2 | 50 |
| 3 | 100 |
| 4 | 100 |
| 5 | 100 |

### 1.2 Return id and success_pct for every account, including accounts with no requests (NULL rate). Round to 2 decimals.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
SELECT a.id,ROUND(100.0*SUM(CASE WHEN r.status='success' THEN 1 ELSE 0 END)/NULLIF(COUNT(r.id),0),2) AS success_pct FROM ai_accounts a LEFT JOIN ai_requests r ON r.account_id=a.id GROUP BY a.id
```

| id | success_pct |
| --- | --- |
| 1 | 75 |
| 2 | 50 |
| 3 | 100 |
| 4 | 100 |
| 5 | 100 |
| 6 | NULL |

## Milestone 2: Multi-grain joins without fan-out

Status: Completed · concept check passed

**Findings**

Validated the business result against the sample and changed data.

### 2.1 Return id, request_count and billed_amount for every account across all dates. Aggregate requests and invoices separately to avoid multiplication; use zeros for missing totals.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
WITH usage AS(SELECT account_id,COUNT(*) AS request_count FROM ai_requests GROUP BY account_id),billing AS(SELECT account_id,SUM(billed_amount) AS billed_amount FROM invoices GROUP BY account_id) SELECT a.id,COALESCE(u.request_count,0) AS request_count,COALESCE(b.billed_amount,0) AS billed_amount FROM ai_accounts a LEFT JOIN usage u ON u.account_id=a.id LEFT JOIN billing b ON b.account_id=a.id
```

| id | request_count | billed_amount |
| --- | --- | --- |
| 1 | 4 | 40 |
| 2 | 2 | 0 |
| 3 | 3 | 80 |
| 4 | 2 | 20 |
| 5 | 1 | 5 |
| 6 | 0 | 80 |

### 2.2 Return id, output_tokens and billed_amount for every account across all dates. Sum only successful output tokens and aggregate invoices separately. Use zeros for missing totals.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
WITH usage AS(SELECT account_id,SUM(output_tokens) AS output_tokens FROM ai_requests WHERE status='success' GROUP BY account_id),billing AS(SELECT account_id,SUM(billed_amount) AS billed_amount FROM invoices GROUP BY account_id) SELECT a.id,COALESCE(u.output_tokens,0) AS output_tokens,COALESCE(b.billed_amount,0) AS billed_amount FROM ai_accounts a LEFT JOIN usage u ON u.account_id=a.id LEFT JOIN billing b ON b.account_id=a.id
```

| id | output_tokens | billed_amount |
| --- | --- | --- |
| 1 | 1700 | 40 |
| 2 | 200 | 0 |
| 3 | 7000 | 80 |
| 4 | 1400 | 20 |
| 5 | 100 | 5 |
| 6 | 0 | 80 |

## Milestone 3: Revenue & payment reconciliation

Status: Not started

_No finding written yet._

### 3.1 Return id, billed_amount, net_collected and gap for every invoice across all periods. Net collected = payments - refunds; gap = billed - net collected. Treat missing totals as zero.

_not attempted_

### 3.2 Using the same definition, return invoice_id and gap only for invoices with nonzero gap.

_not attempted_

## Milestone 4: AI usage cost & contribution margin

Status: Not started

_No finding written yet._

### 4.1 Return model and usage_cost in fictional USD, rounded to 6 decimals, for successful requests across all dates.

_not attempted_

### 4.2 Return id, billed_amount, usage_cost and contribution_margin for every account for Jan 2025. Use January invoices and successful requests only; missing totals are zero. Round cost and margin to 6 decimals. Margin = billed - usage cost.

_not attempted_
