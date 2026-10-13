# Warehouse and Reporting

_Draft report_

Profile raw CRM/sales records, build Silver and Gold tables in the disposable lab, explore the fact table, and publish repeatable reporting logic.

- Sample database: Northstar Retail (bronze_customers, bronze_products, bronze_sales, dim_customer, dim_product, fact_sales)
- Milestones completed (SQL + concept check): 2 of 6
- Findings written: 2 of 6
- Verified checks (Check answer passed): 4
- Exported: 2026-10-12T16:32:59.624Z

Findings are the learner’s own interpretation. Passing a SQL check does not verify the written finding.

## Incomplete for a complete report

- Complete milestone SQL + concept check: Gold: dimensions, facts & quality gates
- Complete milestone SQL + concept check: EDA: explore before telling the story
- Complete milestone SQL + concept check: Monthly change & cumulative reports
- Complete milestone SQL + concept check: Customer & product reporting contracts

## Milestone 1: Bronze: inspect raw data before cleaning

Status: Completed · concept check passed

**Findings**

Validated the business result against the sample and changed data.

### 1.1 Return customer_id (trimmed raw_id) and versions for non-NULL duplicate customer keys in bronze_customers. Keep only keys with more than one version.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
SELECT TRIM(raw_id) AS customer_id,COUNT(*) AS versions FROM bronze_customers WHERE raw_id IS NOT NULL GROUP BY TRIM(raw_id) HAVING COUNT(*)>1
```

| customer_id | versions |
| --- | --- |
| C001 | 2 |

### 1.2 Return row_id and order_date for bronze sales whose date is invalid (date(order_date) IS NULL).

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
SELECT row_id,order_date FROM bronze_sales WHERE date(order_date) IS NULL
```

| row_id | order_date |
| --- | --- |
| 12 | not-a-date |

## Milestone 2: Silver: clean, map & deduplicate

Status: Completed · concept check passed

**Findings**

Validated the business result against the sample and changed data.

### 2.1 Create TEMP silver_customers: trim keys/names; discard NULL/empty keys; keep latest updated_at per trimmed key. Map US/USA→United States, GB/UK→United Kingdom, IND→India, CA→Canada. Return customer_id,name,country.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
CREATE TEMP TABLE silver_customers AS WITH ranked AS(SELECT *,ROW_NUMBER() OVER(PARTITION BY TRIM(raw_id) ORDER BY updated_at DESC) AS rn FROM bronze_customers WHERE raw_id IS NOT NULL AND TRIM(raw_id)<>'') SELECT TRIM(raw_id) AS customer_id,TRIM(name) AS name,CASE UPPER(TRIM(country)) WHEN 'US' THEN 'United States' WHEN 'USA' THEN 'United States' WHEN 'UK' THEN 'United Kingdom' WHEN 'GB' THEN 'United Kingdom' WHEN 'IND' THEN 'India' WHEN 'CA' THEN 'Canada' ELSE UPPER(TRIM(country)) END AS country FROM ranked WHERE rn=1; SELECT customer_id,name,country FROM silver_customers
```

| customer_id | name | country |
| --- | --- | --- |
| C001 | Alice Nguyen | United States |
| C002 | Ben | United Kingdom |
| C003 | Cara | United Kingdom |
| C004 | Dev | India |
| C005 | Elena | Canada |

### 2.2 Create the same TEMP silver_customers, then return country and customer_count per mapped country.

_solved without hints_

**Checked SQL** (verified by Check answer)

```sql
CREATE TEMP TABLE silver_customers AS WITH ranked AS(SELECT *,ROW_NUMBER() OVER(PARTITION BY TRIM(raw_id) ORDER BY updated_at DESC) AS rn FROM bronze_customers WHERE raw_id IS NOT NULL AND TRIM(raw_id)<>'') SELECT TRIM(raw_id) AS customer_id,TRIM(name) AS name,CASE UPPER(TRIM(country)) WHEN 'US' THEN 'United States' WHEN 'USA' THEN 'United States' WHEN 'UK' THEN 'United Kingdom' WHEN 'GB' THEN 'United Kingdom' WHEN 'IND' THEN 'India' WHEN 'CA' THEN 'Canada' ELSE UPPER(TRIM(country)) END AS country FROM ranked WHERE rn=1; SELECT country,COUNT(*) AS customer_count FROM silver_customers GROUP BY country
```

| country | customer_count |
| --- | --- |
| Canada | 1 |
| India | 1 |
| United Kingdom | 2 |
| United States | 1 |

## Milestone 3: Gold: dimensions, facts & quality gates

Status: Not started

_No finding written yet._

### 3.1 Build TEMP built_fact from bronze_sales and dimension lookups. Validate numeric positive quantity, valid date and matching trimmed natural keys. Recompute sales = quantity × dim_product.price. Return sale_key,customer_key,product_key,quantity,sales,order_date.

_not attempted_

### 3.2 Build the same TEMP built_fact; return rejected_rows as source row count minus built fact row count.

_not attempted_

## Milestone 4: EDA: explore before telling the story

Status: Not started

_No finding written yet._

### 4.1 Return first_sale, last_sale, sales_lines and total_sales as one summary row from fact_sales.

_not attempted_

### 4.2 Return metric and value using UNION ALL for Total sales (sum of sales), Units (sum of quantity), and Active customers (distinct customer_key) from fact_sales.

_not attempted_

## Milestone 5: Monthly change & cumulative reports

Status: Not started

_No finding written yet._

### 5.1 Return month (YYYY-MM),sales,running_sales for observed months; cumulative sales ordered by month. Sort output by month.

_not attempted_

### 5.2 Return month,sales,previous_sales,change_pct for observed months. Compare to previous observed month; percentage rounded to 2 decimals, NULL with no/nonzero denominator. Sort by month.

_not attempted_

## Milestone 6: Customer & product reporting contracts

Status: Not started

_No finding written yet._

### 6.1 Return customer_id,name,sales_lines,total_sales,recency_days for every dim_customer. Missing sales total=0; recency=NULL with no sales. Recency = days from last order_date to 2025-04-01, integer.

_not attempted_

### 6.2 Return product_id,name,total_sales,total_units,performance_segment for every dim_product. Missing totals=0. High if total_sales>=200, otherwise Standard.

_not attempted_
