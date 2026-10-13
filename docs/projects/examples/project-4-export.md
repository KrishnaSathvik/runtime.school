# CRM + ERP Integration

_Draft report_

Follow extraction reconciliation, authoritative integration, date quarantine, quality gates, stable keys, replay-safe loads, and atomic promotion. Finish with a customer-grain capstone and field-level lineage.

- Sample database: Northstar CRM + ERP (crm_people, erp_people, erp_locations, load_manifest, product_versions, raw_dates, dq_sales, customer_history, incoming_people, current_people, published_totals, refresh_stage, warehouse_catalog, bronze_sales, dim_customer, dim_product)
- Milestones completed (SQL + concept check): 2 of 12
- Findings written: 2 of 12
- Verified checks (Check answer passed): 4
- Exported: 2026-10-12T16:33:02.886Z

Findings are the learner’s own interpretation. Passing a SQL check does not verify the written finding.

## Incomplete for a complete report

- Complete milestone SQL + concept check: Product validity with LEAD & half-open intervals
- Complete milestone SQL + concept check: Validate calendar dates before converting
- Complete milestone SQL + concept check: Quarantine bad rows & reconcile the batch
- Complete milestone SQL + concept check: Automated star-schema quality tests
- Complete milestone SQL + concept check: Durable surrogate keys across loads
- Complete milestone SQL + concept check: Latest-state reporting versus SCD Type 2
- Complete milestone SQL + concept check: Idempotent incremental UPSERT & stale updates
- Complete milestone SQL + concept check: Stage, validate & atomically promote a refresh
- Complete milestone SQL + concept check: Protect fact grain when joining versions
- Complete milestone SQL + concept check: Capstone: integrated customers to trusted sales

## Milestone 1: Reconcile extraction & Bronze ingestion

Status: Completed · concept check passed

**Findings**

Validated the business result against the sample and changed data.

### 1.1 Return source_name,expected_rows,landed_rows,difference (landed minus expected) for CRM and ERP using load_manifest and the raw tables.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
WITH landed AS(SELECT 'CRM' AS source_name,COUNT(*) AS landed_rows FROM crm_people UNION ALL SELECT 'ERP',COUNT(*) FROM erp_people) SELECT m.source_name,m.expected_rows,l.landed_rows,l.landed_rows-m.expected_rows AS difference FROM load_manifest m JOIN landed l USING(source_name)
```

| source_name | expected_rows | landed_rows | difference |
| --- | --- | --- | --- |
| CRM | 6 | 6 | 0 |
| ERP | 5 | 5 | 0 |

### 1.2 Return source_row and customer_id for CRM records with a missing or whitespace-only customer key. Do not modify Bronze.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
SELECT source_row,customer_id FROM crm_people WHERE customer_id IS NULL OR TRIM(customer_id)=''
```

| source_row | customer_id |
| --- | --- |
| 6 | NULL |

## Milestone 2: Integrate CRM + ERP with source authority

Status: Completed · concept check passed

**Findings**

Validated the business result against the sample and changed data.

### 2.1 Return customer_id,name,gender,country,birth_date using the integration contract in Understand. Use latest normalized CRM keys, CRM-first gender, ERP fallback, mapped country, and valid nonfuture birth date.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
WITH crm AS(WITH ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY TRIM(customer_id) ORDER BY updated_at DESC,source_row DESC) AS rn FROM crm_people WHERE customer_id IS NOT NULL AND TRIM(customer_id)<>'') SELECT TRIM(customer_id) AS customer_id,TRIM(name) AS name,CASE UPPER(TRIM(gender)) WHEN 'F' THEN 'Female' WHEN 'M' THEN 'Male' ELSE NULL END AS crm_gender FROM ranked WHERE rn=1),erp AS(SELECT CASE WHEN SUBSTR(TRIM(erp_id),1,3)='NAS' THEN SUBSTR(TRIM(erp_id),4) ELSE TRIM(erp_id) END AS customer_id,CASE UPPER(TRIM(gender)) WHEN 'F' THEN 'Female' WHEN 'FEMALE' THEN 'Female' WHEN 'M' THEN 'Male' WHEN 'MALE' THEN 'Male' ELSE NULL END AS erp_gender,birth_date FROM erp_people),loc AS(SELECT REPLACE(TRIM(erp_id),'-','') AS customer_id,CASE UPPER(TRIM(country_code)) WHEN 'US' THEN 'United States' WHEN 'USA' THEN 'United States' WHEN 'GB' THEN 'United Kingdom' WHEN 'UK' THEN 'United Kingdom' WHEN 'IND' THEN 'India' ELSE 'Unknown' END AS country FROM erp_locations) SELECT c.customer_id,c.name,COALESCE(c.crm_gender,e.erp_gender,'Unknown') AS gender,COALESCE(l.country,'Unknown') AS country,CASE WHEN e.birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(e.birth_date,'+0 days')=e.birth_date AND e.birth_date<='2025-04-01' THEN e.birth_date ELSE NULL END AS birth_date FROM crm c LEFT JOIN erp e ON e.customer_id=c.customer_id LEFT JOIN loc l ON l.customer_id=c.customer_id
```

| customer_id | name | gender | country | birth_date |
| --- | --- | --- | --- | --- |
| C001 | Alice Nguyen | Female | United States | 1990-05-12 |
| C002 | Ben | Male | United Kingdom | 1988-02-29 |
| C003 | Cara | Female | United Kingdom | NULL |
| C004 | Dev | Unknown | India | 1995-06-20 |

### 2.2 Use the same integration contract; return gender and customer_count grouped by the resolved gender.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
WITH integrated AS(WITH crm AS(WITH ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY TRIM(customer_id) ORDER BY updated_at DESC,source_row DESC) AS rn FROM crm_people WHERE customer_id IS NOT NULL AND TRIM(customer_id)<>'') SELECT TRIM(customer_id) AS customer_id,TRIM(name) AS name,CASE UPPER(TRIM(gender)) WHEN 'F' THEN 'Female' WHEN 'M' THEN 'Male' ELSE NULL END AS crm_gender FROM ranked WHERE rn=1),erp AS(SELECT CASE WHEN SUBSTR(TRIM(erp_id),1,3)='NAS' THEN SUBSTR(TRIM(erp_id),4) ELSE TRIM(erp_id) END AS customer_id,CASE UPPER(TRIM(gender)) WHEN 'F' THEN 'Female' WHEN 'FEMALE' THEN 'Female' WHEN 'M' THEN 'Male' WHEN 'MALE' THEN 'Male' ELSE NULL END AS erp_gender,birth_date FROM erp_people),loc AS(SELECT REPLACE(TRIM(erp_id),'-','') AS customer_id,CASE UPPER(TRIM(country_code)) WHEN 'US' THEN 'United States' WHEN 'USA' THEN 'United States' WHEN 'GB' THEN 'United Kingdom' WHEN 'UK' THEN 'United Kingdom' WHEN 'IND' THEN 'India' ELSE 'Unknown' END AS country FROM erp_locations) SELECT c.customer_id,c.name,COALESCE(c.crm_gender,e.erp_gender,'Unknown') AS gender,COALESCE(l.country,'Unknown') AS country,CASE WHEN e.birth_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(e.birth_date,'+0 days')=e.birth_date AND e.birth_date<='2025-04-01' THEN e.birth_date ELSE NULL END AS birth_date FROM crm c LEFT JOIN erp e ON e.customer_id=c.customer_id LEFT JOIN loc l ON l.customer_id=c.customer_id) SELECT gender,COUNT(*) AS customer_count FROM integrated GROUP BY gender
```

| gender | customer_count |
| --- | --- |
| Female | 2 |
| Male | 1 |
| Unknown | 1 |

## Milestone 3: Product validity with LEAD & half-open intervals

Status: Not started

_No finding written yet._

### 3.1 Return version_id,product_id,valid_from,valid_to. valid_to is the next start for the same product, NULL for the latest version.

_not attempted_

### 3.2 As of 2025-02-01, return product_id,cost for the version effective on that date using inclusive start and exclusive end.

_not attempted_

## Milestone 4: Validate calendar dates before converting

Status: Not started

_No finding written yet._

### 4.1 Return row_id,raw_date,clean_date for every raw_dates row. Accept exactly eight digits and a valid calendar day; invalid values become NULL.

_not attempted_

### 4.2 Return row_id and raw_date only for invalid or missing dates under the same rule.

_not attempted_

## Milestone 5: Quarantine bad rows & reconcile the batch

Status: Not started

_No finding written yet._

### 5.1 Create TEMP checked_dates using the validation rule and TEMP date_rejects with invalid rows. Return row_id,raw_date,reason: missing for NULL, format for not exactly eight digits, otherwise calendar.

_not attempted_

### 5.2 Create TEMP checked_dates; return source_rows,accepted_rows,rejected_rows,reconciled (1 if accepted+rejected equals source count).

_not attempted_

## Milestone 6: Automated star-schema quality tests

Status: Not started

_No finding written yet._

### 6.1 Return test,failures for duplicate_line_ids (number of duplicated id groups), orphan_customers (rows), orphan_products (rows), and invalid_quantity (NULL or <=0 rows) in dq_sales.

_not attempted_

### 6.2 Return blocking_failures as the sum of the four failure counts, and can_publish as 1 only if that sum is zero.

_not attempted_

## Milestone 7: Durable surrogate keys across loads

Status: Not started

_No finding written yet._

### 7.1 Insert natural key C000, name New earlier key, updated_at 2025-02-01 into current_people without supplying customer_key. Return customer_id,customer_key for all rows.

_not attempted_

### 7.2 Update C001 name to Alice Updated without changing its key. Return customer_id,customer_key,name for all current_people rows.

_not attempted_

## Milestone 8: Latest-state reporting versus SCD Type 2

Status: Not started

_No finding written yet._

### 8.1 Return customer_id,country for the current version of every customer_history customer.

_not attempted_

### 8.2 Join fact_sales to dim_customer for natural customer_id and customer_history at sale time. Return sale_key,customer_id,country as of each order_date.

_not attempted_

## Milestone 9: Idempotent incremental UPSERT & stale updates

Status: Not started

_No finding written yet._

### 9.1 Apply incoming_people to current_people with INSERT ON CONFLICT(customer_id) DO UPDATE only if the incoming updated_at is newer. Apply that same batch twice. Return customer_id,name,updated_at.

_not attempted_

### 9.2 Apply that UPSERT once. Return customer_id,customer_key for all current_people rows, showing that old keys stayed stable.

_not attempted_

## Milestone 10: Stage, validate & atomically promote a refresh

Status: Not started

_No finding written yet._

### 10.1 Simulate an interrupted promotion: BEGIN, DELETE published_totals, INSERT from refresh_stage, ROLLBACK. Return customer_id,total_sales; the old snapshot must remain.

_not attempted_

### 10.2 Promote the known-valid refresh_stage in a transaction: DELETE old rows, INSERT staged rows, COMMIT. Return customer_id,total_sales.

_not attempted_

## Milestone 11: Protect fact grain when joining versions

Status: Not started

_No finding written yet._

### 11.1 Return country,total_sales using CURRENT customer_history version, for facts with a customer history match. Group by current country.

_not attempted_

### 11.2 Return country,total_sales using the customer_history version effective at each sale date; group by historical country.

_not attempted_

## Milestone 12: Capstone: integrated customers to trusted sales

Status: Not started

_No finding written yet._

### 12.1 Create TEMP integrated_customers using the integration contract, and TEMP built_sales using the Gold validation rules from lesson Gold: dimensions, facts & quality gates. Return customer_id,name,gender,country,sales_lines,total_sales for valid CRM customers with a dimension match; preserve customers with no valid sales as 0 totals.

_not attempted_

### 12.2 Create the same two TEMP outputs. Return country,total_sales at integrated country grain, preserving countries with no sales as 0.

_not attempted_
