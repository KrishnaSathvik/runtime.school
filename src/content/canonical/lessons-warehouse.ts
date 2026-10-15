import { quiz, step, task, type LessonOverrides, type LessonSpec } from "./spec";
import { RETAIL_WAREHOUSE, RETAIL_WAREHOUSE_MUTATION } from "./retail-warehouse";

const warehouse = (spec: Omit<LessonSpec, "dataset" | "setupSql" | "extraMutation">): LessonSpec => ({ ...spec, dataset: "retail", setupSql: RETAIL_WAREHOUSE, extraMutation: RETAIL_WAREHOUSE_MUTATION });

const SILVER = "CREATE TEMP TABLE silver_customers AS WITH ranked AS (SELECT TRIM(raw_id) AS customer_id, TRIM(name) AS name, country, updated_at, ROW_NUMBER() OVER (PARTITION BY TRIM(raw_id) ORDER BY updated_at DESC) AS rn FROM bronze_customers WHERE raw_id IS NOT NULL AND TRIM(raw_id) <> '') SELECT customer_id, name, CASE UPPER(TRIM(country)) WHEN 'UK' THEN 'United Kingdom' WHEN 'GB' THEN 'United Kingdom' WHEN 'UNITED KINGDOM' THEN 'United Kingdom' WHEN 'DE' THEN 'Germany' WHEN 'FR' THEN 'France' WHEN 'ES' THEN 'Spain' ELSE TRIM(country) END AS country FROM ranked WHERE rn = 1";
const VALID_SALE = "TRIM(b.quantity) <> '' AND TRIM(b.quantity) NOT GLOB '*[^0-9]*' AND CAST(TRIM(b.quantity) AS INTEGER) > 0 AND b.order_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND date(b.order_date, '+0 days') = b.order_date";
const BUILT_FACT = `CREATE TEMP TABLE built_fact AS SELECT b.row_id AS sale_key, c.customer_key, p.product_key, CAST(TRIM(b.quantity) AS INTEGER) AS quantity, ROUND(CAST(TRIM(b.quantity) AS INTEGER) * p.price, 2) AS sales, b.order_date FROM bronze_sales b JOIN dim_customer c ON c.customer_id = TRIM(b.customer_id) JOIN dim_product p ON p.product_id = TRIM(b.product_id) WHERE ${VALID_SALE}`;
const SHAPED = "WITH shaped AS (SELECT row_id, raw_date, substr(raw_date, 1, 4) || '-' || substr(raw_date, 5, 2) || '-' || substr(raw_date, 7, 2) AS candidate FROM raw_dates)";
const CLEAN_DATE = "CASE WHEN raw_date GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' AND date(candidate, '+0 days') = candidate THEN candidate END";
const INTEGRATED = "WITH crm AS (SELECT customer_id, contact_name, crm_gender FROM (SELECT TRIM(customer_id) AS customer_id, TRIM(contact_name) AS contact_name, CASE UPPER(TRIM(gender)) WHEN 'F' THEN 'Female' WHEN 'M' THEN 'Male' END AS crm_gender, ROW_NUMBER() OVER (PARTITION BY TRIM(customer_id) ORDER BY updated_at DESC, source_row DESC) AS rn FROM crm_people WHERE customer_id IS NOT NULL AND TRIM(customer_id) <> '') WHERE rn = 1), erp AS (SELECT CASE WHEN substr(TRIM(erp_id), 1, 3) = 'NAS' THEN substr(TRIM(erp_id), 4) ELSE TRIM(erp_id) END AS customer_id, CASE UPPER(TRIM(gender)) WHEN 'FEMALE' THEN 'Female' WHEN 'MALE' THEN 'Male' END AS erp_gender, CASE WHEN date(birth_date, '+0 days') = birth_date AND birth_date <= '2011-12-31' THEN birth_date END AS birth_date FROM erp_people), loc AS (SELECT REPLACE(TRIM(erp_id), '-', '') AS customer_id, k.country FROM erp_locations e LEFT JOIN country_codes k ON k.code = UPPER(TRIM(e.country_code)))";
const INTEGRATED_SELECT = "SELECT crm.customer_id, crm.contact_name, COALESCE(crm.crm_gender, erp.erp_gender) AS gender, loc.country, erp.birth_date FROM crm LEFT JOIN erp ON erp.customer_id = crm.customer_id LEFT JOIN loc ON loc.customer_id = crm.customer_id";

/** Warehouse & reporting: lessons 69–74 and 76–87, one Retail warehouse story. */
export const warehouseLessons: LessonOverrides = {
  69: warehouse({
    decision: "REWRITE", reason: "Bronze now holds raw extracts of the real Retail customers and December 2011 sales, with defects seeded deterministically.",
    concept: "Bronze keeps source records exactly as received so every later step can be traced back. Before writing cleaning rules, profile the raw data: missing and untrimmed keys, repeated versions of the same entity, text that should be numbers, and dates that do not parse. Profiling describes problems; it does not fix or delete anything.",
    trap: "date(order_date) IS NULL catches impossible and badly formatted dates, but a NULL order_date is also NULL; decide whether that is a separate problem.",
    grain: "One row per raw customer key with several versions, then one row per raw sales line with an invalid date.",
    example: "SELECT raw_id, name, country, updated_at\nFROM bronze_customers\nWHERE raw_id IS NULL OR TRIM(raw_id) = '' OR raw_id <> TRIM(raw_id)\nLIMIT 20;",
    hints: ["GROUP BY TRIM(raw_id) and keep groups with COUNT(*) > 1; skip NULL and empty keys.", "date(order_date) returns NULL when the text is not a valid YYYY-MM-DD date."],
    tasks: [
      task("Return customer_id (the trimmed raw_id) and versions for every non-empty customer key that appears in more than one bronze_customers row.", "SELECT TRIM(raw_id) AS customer_id, COUNT(*) AS versions FROM bronze_customers WHERE raw_id IS NOT NULL AND TRIM(raw_id) <> '' GROUP BY TRIM(raw_id) HAVING COUNT(*) > 1"),
      task("Return row_id and order_date for bronze_sales rows whose order_date is not a valid date (date(order_date) is NULL).", "SELECT row_id, order_date FROM bronze_sales WHERE date(order_date) IS NULL"),
    ],
    quiz: quiz("Bronze contains a sales row with quantity '12 pcs'. What should the Bronze layer do with it?", ["Fix it to 12", "Keep it as received", "Delete it"], 1, "Bronze preserves source data; cleaning rules belong to Silver and Gold, where they are documented."),
    walkthrough: [
      step("Find broken customer keys", "Run this. Some raw_id values are missing or have extra spaces—those would fail later joins if you did not clean them in Silver.", "SELECT raw_id, name, country, updated_at FROM bronze_customers WHERE raw_id IS NULL OR TRIM(raw_id) = '' OR raw_id <> TRIM(raw_id) LIMIT 20;"),
      step("Find quantities that are not plain numbers", "Bronze keeps source text as-is. You will see empty quantities, signs, and unit suffixes that Gold must reject or parse.", "SELECT row_id, quantity FROM bronze_sales WHERE TRIM(quantity) = '' OR TRIM(quantity) GLOB '*[^0-9]*' LIMIT 20;"),
      step("Profile country before cleaning", "One summary row counts missing countries and how many distinct spellings appear—profiling describes problems without changing Bronze.", "SELECT COUNT(*) AS rows,\n  SUM(country IS NULL OR TRIM(country) = '') AS missing_country,\n  COUNT(DISTINCT country) AS raw_spellings,\n  COUNT(DISTINCT UPPER(TRIM(country))) AS normalized_spellings\nFROM bronze_customers;"),
    ],
  }),
  70: warehouse({
    decision: "MIGRATE", reason: "Silver cleaning rules applied to the Retail Bronze customer extract.",
    concept: "Silver applies explicit, documented rules: trim keys and text, drop rows with no usable key, keep the latest version of each customer, and map inconsistent country codes to one spelling. Write the rules so a reviewer can see exactly why each row was kept, changed or excluded.",
    trap: "A new surrogate key is not deduplication: numbering every Bronze row gives one customer several keys.",
    grain: "One row per cleaned customer, then one row per mapped country.",
    example: "SELECT UPPER(TRIM(country)) AS raw_country, COUNT(*) AS rows\nFROM bronze_customers\nGROUP BY raw_country\nORDER BY rows DESC;",
    hints: ["ROW_NUMBER() OVER (PARTITION BY TRIM(raw_id) ORDER BY updated_at DESC) = 1 keeps the latest version.", "Map UK, GB and UNITED KINGDOM to 'United Kingdom', DE to 'Germany', FR to 'France', ES to 'Spain'; otherwise keep TRIM(country)."],
    tasks: [
      task("Create TEMP table silver_customers with customer_id (trimmed raw_id), name (trimmed) and country, keeping only the latest updated_at version of each non-empty key and mapping UK/GB/UNITED KINGDOM → United Kingdom, DE → Germany, FR → France, ES → Spain (otherwise the trimmed value). Return customer_id, name and country from it.", `${SILVER}; SELECT customer_id, name, country FROM silver_customers`, { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_temp_schema WHERE type = 'table' AND name = 'silver_customers'", value: 1 }] }),
      task("Create the same silver_customers table, then return country and customer_count for each mapped country.", `${SILVER}; SELECT country, COUNT(*) AS customer_count FROM silver_customers GROUP BY country`, { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_temp_schema WHERE type = 'table' AND name = 'silver_customers'", value: 1 }] }),
    ],
    quiz: quiz("Why partition by TRIM(raw_id) rather than raw_id?", ["It is faster", "' 12347' and '12347' are the same customer", "TRIM removes duplicates"], 1, "Untrimmed keys would split one customer into several groups."),
    walkthrough: [
      step("See country spelling variants", "Run this on Bronze. UK, GB, and full names show up as separate groups—Silver will map them to one country label.", "SELECT UPPER(TRIM(country)) AS raw_country, COUNT(*) AS rows FROM bronze_customers GROUP BY raw_country ORDER BY rows DESC;"),
      step("See duplicate versions of one customer", "Customer 12347 appears several times with different updated_at values; Silver keeps only the latest row per trimmed key.", "SELECT raw_id, name, country, updated_at FROM bronze_customers WHERE TRIM(raw_id) = '12347' ORDER BY updated_at;"),
    ],
  }),
  71: warehouse({
    decision: "MIGRATE", reason: "Gold fact build from Retail Bronze sales and the existing star-schema dimensions.",
    concept: "Gold presents business entities and measures. A fact row is one sales line; its surrogate keys come from looking up the existing dimensions, not from numbering rows again. Quality gates reject lines with unknown keys, non-numeric or non-positive quantities and invalid dates, and the measure is recomputed by a declared rule (quantity × catalog price).",
    trap: "An inner join to the dimensions is itself a quality gate: lines with unknown customers or products disappear. Count the rejects so the batch reconciles.",
    grain: "One row per accepted sales line, then one summary row.",
    example: "SELECT COUNT(*) AS unknown_products\nFROM bronze_sales b\nLEFT JOIN dim_product p ON p.product_id = TRIM(b.product_id)\nWHERE p.product_key IS NULL;",
    hints: ["Join dim_customer on TRIM(customer_id) and dim_product on TRIM(product_id).", "Accept quantity only if TRIM(quantity) is non-empty, all digits and > 0; accept order_date only if it is YYYY-MM-DD and date(order_date, '+0 days') = order_date."],
    tasks: [
      task("Create TEMP table built_fact from bronze_sales: sale_key = row_id, customer_key and product_key from the dimensions (trimmed natural keys), quantity as an integer, sales = quantity × dim_product.price rounded to 2, and order_date. Accept only rows with all-digit positive quantities and valid YYYY-MM-DD dates. Return sale_key, customer_key, product_key, quantity, sales and order_date.", `${BUILT_FACT}; SELECT sale_key, customer_key, product_key, quantity, sales, order_date FROM built_fact`, { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_temp_schema WHERE type = 'table' AND name = 'built_fact'", value: 1 }] }),
      task("Create the same built_fact table, then return source_rows, accepted_rows and rejected_rows for the batch.", `${BUILT_FACT}; SELECT (SELECT COUNT(*) FROM bronze_sales) AS source_rows, (SELECT COUNT(*) FROM built_fact) AS accepted_rows, (SELECT COUNT(*) FROM bronze_sales) - (SELECT COUNT(*) FROM built_fact) AS rejected_rows`, { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_temp_schema WHERE type = 'table' AND name = 'built_fact'", value: 1 }] }),
    ],
    quiz: quiz("Where should a fact row’s customer_key come from?", ["ROW_NUMBER over the batch", "A lookup in dim_customer by natural key", "The Bronze row_id"], 1, "Surrogate keys are assigned once in the dimension and reused by every fact load."),
    walkthrough: [
      step("Count sales with unknown products", "Run this. Lines whose product_id does not match dim_product are rejects—inner joins to the dimension drop them unless you count them first.", "SELECT COUNT(*) AS unknown_products FROM bronze_sales b LEFT JOIN dim_product p ON p.product_id = TRIM(b.product_id) WHERE p.product_key IS NULL;"),
      step("Preview dimension keys for facts", "Gold facts must reuse customer_key and product_key from these tables, not invent new ids from Bronze row numbers.", "SELECT customer_key, customer_id, country FROM dim_customer LIMIT 10;"),
    ],
  }),
  72: warehouse({
    decision: "MIGRATE", reason: "Exploratory profiling of the real 2011 Retail fact table.",
    concept: "Exploratory data analysis (EDA) checks the shape of the data before reporting on it: the date range, the number of rows, totals of the main measures and how many entities are active. These numbers become the reference points every later report must agree with.",
    trap: "COUNT(*) on fact_sales counts lines, not orders or customers; name each metric by what it counts.",
    grain: "One summary row, then one row per metric.",
    example: "SELECT substr(order_date, 1, 7) AS month, COUNT(*) AS lines\nFROM fact_sales\nGROUP BY month;",
    hints: ["MIN(order_date), MAX(order_date), COUNT(*), ROUND(SUM(sales), 2).", "SELECT 'Total sales' AS metric, … UNION ALL SELECT 'Units', … UNION ALL SELECT 'Active customers', …"],
    tasks: [
      task("Return one row from fact_sales with first_sale, last_sale, sales_lines and total_sales (rounded to 2 decimals).", "SELECT MIN(order_date) AS first_sale, MAX(order_date) AS last_sale, COUNT(*) AS sales_lines, ROUND(SUM(sales), 2) AS total_sales FROM fact_sales"),
      task("Using UNION ALL, return metric and value rows for 'Total sales' (sum of sales, rounded to 2), 'Units' (sum of quantity) and 'Active customers' (distinct customer_key).", "SELECT 'Total sales' AS metric, ROUND(SUM(sales), 2) AS value FROM fact_sales UNION ALL SELECT 'Units', SUM(quantity) FROM fact_sales UNION ALL SELECT 'Active customers', COUNT(DISTINCT customer_key) FROM fact_sales"),
    ],
    quiz: quiz("fact_sales has one row per sales line. What does COUNT(DISTINCT order_id) measure?", ["Lines", "Orders", "Customers"], 1, "Distinct order ids count orders; COUNT(*) counts lines."),
    walkthrough: [
      step("Count sales lines per month", "Each row is one month’s line count on fact_sales—you see seasonality before you build any formal report.", "SELECT substr(order_date, 1, 7) AS month, COUNT(*) AS lines FROM fact_sales GROUP BY month;"),
      step("See the largest sale lines", "The top ten rows by sales flag extreme quantities and amounts worth checking before you trust aggregates.", "SELECT sale_key, quantity, sales FROM fact_sales ORDER BY sales DESC LIMIT 10;"),
    ],
  }),
  73: warehouse({
    decision: "MIGRATE", reason: "Customer and product report contracts on the Retail star schema.",
    concept: "A reporting contract fixes the grain, columns and rules of a report so every reader gets the same numbers: one row per customer (including customers with no sales), a defined reference date for recency, and explicit thresholds for segments.",
    trap: "An inner join from customers to sales silently drops customers with no 2011 purchases; a customer report should keep them with zero sales.",
    grain: "One row per customer, then one row per product.",
    example: "SELECT c.customer_id, COUNT(s.sale_key) AS lines\nFROM dim_customer c LEFT JOIN fact_sales s ON s.customer_key = c.customer_key\nGROUP BY c.customer_id\nORDER BY lines\nLIMIT 10;",
    hints: ["LEFT JOIN fact_sales and COALESCE the total to 0.", "Recency = CAST(julianday('2011-12-10') − julianday(MAX(order_date)) AS INTEGER)."],
    tasks: [
      task("For every customer in dim_customer, return customer_id, sales_lines, total_sales (rounded to 2, 0 when none) and recency_days: whole days from the last 2011 order_date to 2011-12-10, NULL with no sales.", "SELECT c.customer_id, COUNT(s.sale_key) AS sales_lines, ROUND(COALESCE(SUM(s.sales), 0), 2) AS total_sales, CAST(julianday('2011-12-10') - julianday(MAX(s.order_date)) AS INTEGER) AS recency_days FROM dim_customer c LEFT JOIN fact_sales s ON s.customer_key = c.customer_key GROUP BY c.customer_id"),
      task("For every product in dim_product, return product_id, total_sales (rounded to 2, 0 when none), total_units (0 when none) and segment: 'High' when total_sales is at least 1000, 'None' when the product had no sales, otherwise 'Standard'.", "SELECT p.product_id, ROUND(COALESCE(SUM(s.sales), 0), 2) AS total_sales, COALESCE(SUM(s.quantity), 0) AS total_units, CASE WHEN COUNT(s.sale_key) = 0 THEN 'None' WHEN SUM(s.sales) >= 1000 THEN 'High' ELSE 'Standard' END AS segment FROM dim_product p LEFT JOIN fact_sales s ON s.product_key = p.product_key GROUP BY p.product_id"),
    ],
    quiz: quiz("Why fix recency to 2011-12-10 instead of today?", ["Dates are text", "So the report gives the same answer whenever it runs", "SQLite has no current date"], 1, "A fixed reference date makes the contract reproducible."),
    walkthrough: [
      step("Keep customers with no sales", "LEFT JOIN from dim_customer to fact_sales still returns customers with zero lines—an inner join would drop them from a customer report.", "SELECT c.customer_id, COUNT(s.sale_key) AS lines FROM dim_customer c LEFT JOIN fact_sales s ON s.customer_key = c.customer_key GROUP BY c.customer_id ORDER BY lines LIMIT 10;"),
      step("Measure whole days between dates", "julianday subtracts two dates and gives a whole-day count—the same idea recency_days uses with a fixed reference date.", "SELECT julianday('2011-12-10') - julianday('2011-11-30') AS days;"),
    ],
  }),
  74: warehouse({
    decision: "MIGRATE", reason: "Monthly change and running totals on the real 2011 sales year.",
    concept: "Monthly reports aggregate to one row per month first, then use window functions across months: SUM(…) OVER (ORDER BY month) for cumulative sales and LAG(…) for the previous month’s value and the percentage change.",
    trap: "Applying LAG before aggregating compares sales lines, not months.",
    grain: "One row per month.",
    example: "SELECT substr(order_date, 1, 7) AS month, ROUND(SUM(sales), 2) AS sales\nFROM fact_sales\nGROUP BY month\nORDER BY month;",
    hints: ["Aggregate per month in a CTE, then SUM(sales) OVER (ORDER BY month).", "ROUND(100.0 * (sales − previous) / NULLIF(previous, 0), 2)."],
    tasks: [
      task("Return month (YYYY-MM), sales (rounded to 2) and running_sales (cumulative sales through that month, rounded to 2), ordered by month.", "WITH m AS (SELECT substr(order_date, 1, 7) AS month, SUM(sales) AS sales FROM fact_sales GROUP BY month) SELECT month, ROUND(sales, 2) AS sales, ROUND(SUM(sales) OVER (ORDER BY month), 2) AS running_sales FROM m ORDER BY month", { ordered: true }),
      task("Return month, sales, previous_sales and change_pct ((sales − previous) ÷ previous × 100, 2 decimals; NULL for the first month), ordered by month. Round sales and previous_sales to 2.", "WITH m AS (SELECT substr(order_date, 1, 7) AS month, SUM(sales) AS sales FROM fact_sales GROUP BY month) SELECT month, ROUND(sales, 2) AS sales, ROUND(LAG(sales) OVER (ORDER BY month), 2) AS previous_sales, ROUND(100.0 * (sales - LAG(sales) OVER (ORDER BY month)) / NULLIF(LAG(sales) OVER (ORDER BY month), 0), 2) AS change_pct FROM m ORDER BY month", { ordered: true }),
    ],
    quiz: quiz("What is the change_pct for the first month?", ["0", "NULL", "100"], 1, "There is no previous month, so the change is undefined."),
    walkthrough: [
      step("Aggregate sales by month first", "One row per month with rounded totals—that monthly grain is what running sums and month-over-month windows need.", "SELECT substr(order_date, 1, 7) AS month, ROUND(SUM(sales), 2) AS sales FROM fact_sales GROUP BY month ORDER BY month;"),
      step("Find the busiest months by orders", "Distinct order_id per month shows which months drove the most orders—November usually leads for this wholesaler.", "SELECT substr(order_date, 1, 7) AS month, COUNT(DISTINCT order_id) AS orders FROM fact_sales GROUP BY month ORDER BY orders DESC LIMIT 3;"),
      step("Compare each month to the prior one", "After aggregating to months, LAG(orders) pulls the previous month’s value on the same result set.", "WITH m AS (SELECT substr(order_date, 1, 7) AS month, COUNT(DISTINCT order_id) AS orders FROM fact_sales GROUP BY month)\nSELECT month, orders, LAG(orders) OVER (ORDER BY month) AS previous_orders\nFROM m\nORDER BY month;"),
    ],
  }),
  76: warehouse({
    decision: "MIGRATE", reason: "Extraction reconciliation for the Retail CRM and ERP feeds.",
    concept: "Before cleaning, reconcile what landed with what the source said it sent. Compare a load manifest’s expected row counts with the rows that arrived, and list records that cannot be keyed. A difference is evidence to investigate with the source owner, not permission to delete data.",
    trap: "Matching counts do not prove the load is right: shifted columns or swapped values keep the same number of rows.",
    grain: "One row per source system, then one row per CRM record without a usable key.",
    example: "SELECT source_name, expected_rows FROM load_manifest;",
    hints: ["Count each landed table in a CTE with UNION ALL, then join to load_manifest.", "customer_id IS NULL OR TRIM(customer_id) = ''."],
    tasks: [
      task("Return source_name, expected_rows, landed_rows and difference (landed minus expected) for the CRM (crm_people) and ERP (erp_people) loads.", "WITH landed AS (SELECT 'CRM' AS source_name, COUNT(*) AS landed_rows FROM crm_people UNION ALL SELECT 'ERP', COUNT(*) FROM erp_people) SELECT m.source_name, m.expected_rows, l.landed_rows, l.landed_rows - m.expected_rows AS difference FROM load_manifest m JOIN landed l ON l.source_name = m.source_name"),
      task("Return source_row and customer_id for CRM records whose customer_id is missing or only whitespace.", "SELECT source_row, customer_id FROM crm_people WHERE customer_id IS NULL OR TRIM(customer_id) = ''"),
    ],
    quiz: quiz("CRM expected 1,710 rows and 1,707 landed. What is the right next step?", ["Delete three rows from the manifest", "Investigate the three missing rows with the source", "Ignore it"], 1, "A count mismatch is a finding to explain."),
    walkthrough: [
      step("Read expected row counts", "load_manifest records what CRM and ERP said they sent—reconciliation starts by comparing these expectations to what landed.", "SELECT source_name, expected_rows FROM load_manifest;"),
      step("Find CRM rows without a key", "Run this. Missing or blank customer_id rows cannot join to a customer master until you fix or quarantine them.", "SELECT source_row, customer_id, contact_name FROM crm_people WHERE customer_id IS NULL OR TRIM(customer_id) = '';"),
      step("Compare row count to distinct keys", "When crm_rows exceeds distinct_keys, the same customer id arrived more than once—you will dedupe in integration.", "SELECT COUNT(*) AS crm_rows, COUNT(DISTINCT TRIM(customer_id)) AS distinct_keys\nFROM crm_people;"),
    ],
  }),
  77: warehouse({
    decision: "MIGRATE", reason: "CRM + ERP integration contract over Retail customers’ contact records.",
    concept: "Integration follows a written contract. Here: keep the latest CRM version per trimmed key (source_row breaks equal timestamps); normalize ERP keys by removing a leading NAS and location keys by removing hyphens; CRM gender wins when it is F or M, ERP gender is the fallback; countries come from the ISO code table; birth dates must be valid and not after 2011-12-31. Every keyed CRM customer is kept.",
    trap: "COALESCE(crm_gender, erp_gender) only works if sentinel values like 'n/a' and '' are first turned into NULL.",
    grain: "One row per integrated customer, then one row per gender.",
    example: "SELECT erp_id, CASE WHEN substr(TRIM(erp_id), 1, 3) = 'NAS' THEN substr(TRIM(erp_id), 4) ELSE TRIM(erp_id) END AS customer_id\nFROM erp_people\nLIMIT 10;",
    hints: ["Build crm, erp and loc CTEs that each produce one row per normalized customer_id.", "LEFT JOIN erp and loc to crm so CRM customers without ERP records are kept."],
    tasks: [
      task("Return customer_id, contact_name, gender, country and birth_date for every keyed CRM customer under the integration contract.", `${INTEGRATED} ${INTEGRATED_SELECT}`),
      task("Under the same contract, return gender and customer_count per resolved gender (including NULL).", `${INTEGRATED}, integrated AS (${INTEGRATED_SELECT}) SELECT gender, COUNT(*) AS customer_count FROM integrated GROUP BY gender`),
    ],
    quiz: quiz("CRM gender is 'n/a' and ERP gender is 'Female'. Under the contract, what is the resolved gender?", ["n/a", "Female", "NULL"], 1, "'n/a' is mapped to NULL first, so the ERP value is used as the fallback."),
    walkthrough: [
      step("Strip NAS from ERP ids", "Some erp_id values start with NAS; the contract removes that prefix so ERP keys align with CRM customer_id.", "SELECT erp_id, CASE WHEN substr(TRIM(erp_id), 1, 3) = 'NAS' THEN substr(TRIM(erp_id), 4) ELSE TRIM(erp_id) END AS customer_id FROM erp_people LIMIT 10;"),
      step("Remove hyphens from location ids", "erp_locations uses hyphenated ids; REPLACE lets you join locations to the same normalized customer_id as people.", "SELECT erp_id, REPLACE(erp_id, '-', '') AS customer_id, country_code FROM erp_locations LIMIT 10;"),
      step("Group ERP gender spellings", "ERP uses FEMALE and MALE while CRM uses F and M—you need explicit mapping before COALESCE can pick a fallback.", "SELECT UPPER(TRIM(gender)) AS erp_gender, COUNT(*) AS customers\nFROM erp_people\nGROUP BY UPPER(TRIM(gender));"),
    ],
  }),
  78: warehouse({
    decision: "MIGRATE", reason: "Validity intervals for Retail product cost versions.",
    concept: "A versioned table stores each version with the date it became valid. LEAD(valid_from) over the same product gives the next version’s start, which is this version’s exclusive end. An as-of query then picks the version with valid_from <= date < valid_to.",
    trap: "Using <= on both ends makes the boundary day match two versions.",
    grain: "One row per cost version, then one row per product as of a date.",
    example: "SELECT product_id, cost, valid_from\nFROM product_versions\nWHERE product_id = '20726'\nORDER BY valid_from;",
    hints: ["LEAD(valid_from) OVER (PARTITION BY product_id ORDER BY valid_from) AS valid_to.", "valid_from <= '2011-06-15' AND (valid_to IS NULL OR '2011-06-15' < valid_to)."],
    tasks: [
      task("Return version_id, product_id, valid_from and valid_to, where valid_to is the next version’s valid_from for the same product (NULL for the current version).", "SELECT version_id, product_id, valid_from, LEAD(valid_from) OVER (PARTITION BY product_id ORDER BY valid_from) AS valid_to FROM product_versions"),
      task("Return product_id and cost for the version in effect on 2011-06-15 (start inclusive, end exclusive).", "WITH v AS (SELECT product_id, cost, valid_from, LEAD(valid_from) OVER (PARTITION BY product_id ORDER BY valid_from) AS valid_to FROM product_versions) SELECT product_id, cost FROM v WHERE valid_from <= '2011-06-15' AND (valid_to IS NULL OR '2011-06-15' < valid_to)"),
    ],
    quiz: quiz("Versions start 2011-03-01 and 2011-09-15. Which version applies on 2011-09-15?", ["The first", "The second", "Both"], 1, "The second version’s start is the first version’s exclusive end."),
    walkthrough: [
      step("List one product’s cost versions", "Each row is a new cost starting on valid_from for product 20726—as-of queries pick the row whose interval contains your date.", "SELECT product_id, cost, valid_from FROM product_versions WHERE product_id = '20726' ORDER BY valid_from;"),
      step("Find products with many versions", "Products at the top changed cost more than once in the period, so valid_to boundaries matter for historical pricing.", "SELECT product_id, COUNT(*) AS versions FROM product_versions GROUP BY product_id ORDER BY versions DESC LIMIT 10;"),
      step("Compute the next version with LEAD", "LEAD(valid_from) over each product gives the next version’s start, which becomes this version’s exclusive end date.", "SELECT product_id, cost, valid_from,\n  LEAD(valid_from) OVER (PARTITION BY product_id ORDER BY valid_from) AS next_valid_from\nFROM product_versions\nWHERE product_id = '20726';"),
    ],
  }),
  79: warehouse({
    decision: "MIGRATE", reason: "Calendar validation of a Retail legacy date export.",
    concept: "Eight digits do not prove a valid date. Shape YYYYMMDD into YYYY-MM-DD, require exactly eight digits, and keep the candidate only if date(candidate, '+0 days') returns the same text; SQLite normalizes impossible dates such as 2011-11-31 to another day, which exposes them. Invalid values become NULL while the source row is kept.",
    trap: "date('2011-11-31') returns '2011-12-01' rather than NULL; comparing the result with the candidate is what rejects it.",
    grain: "One row per raw date value.",
    example: "SELECT date('2011-11-31', '+0 days') AS normalized, date('2011-02-29', '+0 days') AS not_a_leap_year;",
    hints: ["raw_date GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'.", "Compare date(candidate, '+0 days') with candidate."],
    tasks: [
      task("Return row_id, raw_date and clean_date for every raw_dates row: the YYYY-MM-DD date when raw_date is exactly eight digits forming a real calendar date, otherwise NULL.", `${SHAPED} SELECT row_id, raw_date, ${CLEAN_DATE} AS clean_date FROM shaped`),
      task("Return row_id and raw_date only for rows whose value is missing or invalid under the same rule.", `${SHAPED} SELECT row_id, raw_date FROM shaped WHERE ${CLEAN_DATE} IS NULL`),
    ],
    quiz: quiz("What does date('2011-11-31', '+0 days') return in SQLite?", ["NULL", "'2011-12-01'", "'2011-11-31'"], 1, "SQLite rolls the extra day over; the mismatch with the input reveals the invalid date."),
    walkthrough: [
      step("See invalid dates normalize away", "Run this. SQLite rolls impossible dates like 2011-11-31 forward—comparing normalized output to your candidate is how you reject bad calendar values.", "SELECT date('2011-11-31', '+0 days') AS normalized, date('2011-02-29', '+0 days') AS not_a_leap_year;"),
      step("Group raw date string lengths", "Most export values are eight characters; shorter or longer strings fail the format gate before you parse them.", "SELECT raw_date, length(raw_date) AS chars, COUNT(*) AS rows FROM raw_dates GROUP BY length(raw_date) ORDER BY rows DESC;"),
      step("Test eight-digit shape with GLOB", "GLOB confirms YYYYMMDD shape before you build candidate and run the calendar check.", "SELECT raw_date, raw_date GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' AS eight_digits\nFROM raw_dates\nLIMIT 10;"),
    ],
  }),
  80: warehouse({
    decision: "MIGRATE", reason: "Quarantine and batch reconciliation for the Retail date export.",
    concept: "Filtering bad rows is not enough. Keep a reject table with the source key, the raw value and a reason, and prove the batch reconciles: accepted plus rejected equals the source count, with no row in both. Classify each reject by one deterministic primary reason.",
    trap: "If a row can match two reasons, CASE must check them in a fixed order so each row gets exactly one.",
    grain: "One row per rejected value, then one summary row.",
    example: "SELECT COUNT(*) AS source_rows FROM raw_dates;",
    hints: ["Reason order: missing (NULL), format (not exactly eight digits), calendar (eight digits but not a real date).", "SUM(clean_date IS NOT NULL) and SUM(clean_date IS NULL) over checked_dates."],
    tasks: [
      task("Create TEMP table checked_dates (row_id, raw_date, clean_date under the lesson 79 rule) and TEMP table date_rejects (row_id, raw_date, reason) for rows with no clean_date, with reason 'missing', 'format' or 'calendar'. Return row_id, raw_date and reason from date_rejects.", `CREATE TEMP TABLE checked_dates AS ${SHAPED} SELECT row_id, raw_date, ${CLEAN_DATE} AS clean_date FROM shaped; CREATE TEMP TABLE date_rejects AS SELECT row_id, raw_date, CASE WHEN raw_date IS NULL THEN 'missing' WHEN raw_date NOT GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' THEN 'format' ELSE 'calendar' END AS reason FROM checked_dates WHERE clean_date IS NULL; SELECT row_id, raw_date, reason FROM date_rejects`, { validate: [
        { sql: "SELECT COUNT(*) FROM sqlite_temp_schema WHERE type = 'table' AND name = 'checked_dates'", value: 1 },
        { sql: "SELECT COUNT(*) FROM sqlite_temp_schema WHERE type = 'table' AND name = 'date_rejects'", value: 1 },
      ] }),
      task("Create TEMP table checked_dates as above, then return source_rows, accepted_rows, rejected_rows and reconciled (1 when accepted plus rejected equals the source count).", `CREATE TEMP TABLE checked_dates AS ${SHAPED} SELECT row_id, raw_date, ${CLEAN_DATE} AS clean_date FROM shaped; SELECT (SELECT COUNT(*) FROM raw_dates) AS source_rows, SUM(clean_date IS NOT NULL) AS accepted_rows, SUM(clean_date IS NULL) AS rejected_rows, (SUM(clean_date IS NOT NULL) + SUM(clean_date IS NULL)) = (SELECT COUNT(*) FROM raw_dates) AS reconciled FROM checked_dates`, { validate: [{ sql: "SELECT COUNT(*) FROM sqlite_temp_schema WHERE type = 'table' AND name = 'checked_dates'", value: 1 }] }),
    ],
    quiz: quiz("A batch has 584 rows; 560 are accepted. How many rejects must the reject table hold to reconcile?", ["0", "24", "584"], 1, "Accepted plus rejected must equal the source count."),
    walkthrough: [
      step("Count source rows to reconcile", "source_rows is the total from raw_dates—accepted plus rejected rows in your batch must equal this number.", "SELECT COUNT(*) AS source_rows FROM raw_dates;"),
      step("Classify rejects in fixed order", "CASE checks missing first, then format, then calendar so each bad row gets exactly one primary reason.", "SELECT raw_date, CASE WHEN raw_date IS NULL THEN 'missing' WHEN raw_date NOT GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]' THEN 'format' ELSE 'eight digits' END AS first_check FROM raw_dates WHERE raw_date IS NULL OR length(raw_date) <> 8 LIMIT 10;"),
      step("Verify calendar dates survive normalization", "For well-formed eight-digit strings, normalized should match candidate—mismatch means the calendar is invalid.", "SELECT raw_date,\n  substr(raw_date, 1, 4) || '-' || substr(raw_date, 5, 2) || '-' || substr(raw_date, 7, 2) AS candidate,\n  date(substr(raw_date, 1, 4) || '-' || substr(raw_date, 5, 2) || '-' || substr(raw_date, 7, 2), '+0 days') AS normalized\nFROM raw_dates\nWHERE raw_date GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'\nLIMIT 10;"),
    ],
  }),
  81: warehouse({
    decision: "MIGRATE", reason: "Named quality tests over a Retail December batch.",
    concept: "A data quality test has a name, an expectation and a failure count. Zero failures means that expectation held, not that the data is perfect. Check unique line ids, valid quantities and both dimension relationships, then gate publication on the blocking tests.",
    trap: "Failure counts can overlap on one row; their sum counts rule violations, not distinct bad rows.",
    grain: "One row per test, then one gate row.",
    example: "SELECT line_id, COUNT(*) AS copies\nFROM dq_sales\nGROUP BY line_id\nHAVING COUNT(*) > 1\nLIMIT 10;",
    hints: ["Each test is one SELECT returning a name and a COUNT; combine them with UNION ALL.", "Sum the failures in a CTE; can_publish is (blocking_failures = 0)."],
    tasks: [
      task("Return test and failures for duplicate_line_ids (line ids appearing more than once), orphan_customers (rows whose customer_key is not in dim_customer), orphan_products (rows whose product_key is not in dim_product) and invalid_quantity (NULL or not positive).", "SELECT 'duplicate_line_ids' AS test, COUNT(*) AS failures FROM (SELECT line_id FROM dq_sales GROUP BY line_id HAVING COUNT(*) > 1) UNION ALL SELECT 'orphan_customers', COUNT(*) FROM dq_sales s LEFT JOIN dim_customer c ON c.customer_key = s.customer_key WHERE c.customer_key IS NULL UNION ALL SELECT 'orphan_products', COUNT(*) FROM dq_sales s LEFT JOIN dim_product p ON p.product_key = s.product_key WHERE p.product_key IS NULL UNION ALL SELECT 'invalid_quantity', COUNT(*) FROM dq_sales WHERE quantity IS NULL OR quantity <= 0"),
      task("Return blocking_failures (the sum of the four failure counts) and can_publish (1 only when that sum is 0).", "WITH checks AS (SELECT COUNT(*) AS failures FROM (SELECT line_id FROM dq_sales GROUP BY line_id HAVING COUNT(*) > 1) UNION ALL SELECT COUNT(*) FROM dq_sales s LEFT JOIN dim_customer c ON c.customer_key = s.customer_key WHERE c.customer_key IS NULL UNION ALL SELECT COUNT(*) FROM dq_sales s LEFT JOIN dim_product p ON p.product_key = s.product_key WHERE p.product_key IS NULL UNION ALL SELECT COUNT(*) FROM dq_sales WHERE quantity IS NULL OR quantity <= 0) SELECT SUM(failures) AS blocking_failures, SUM(failures) = 0 AS can_publish FROM checks"),
    ],
    quiz: quiz("A test reports 0 failures. What does that prove?", ["The batch is perfect", "That specific expectation held", "Nothing"], 1, "Each test proves only its own rule."),
    walkthrough: [
      step("Find duplicated line ids", "Run this. line_id should be unique; groups with COUNT(*) > 1 mean the same sale line arrived twice in the batch.", "SELECT line_id, COUNT(*) AS copies FROM dq_sales GROUP BY line_id HAVING COUNT(*) > 1 LIMIT 10;"),
      step("Find facts missing a customer dimension", "customer_key values with no dim_customer row are orphans—those lines fail the relationship test before publish.", "SELECT s.line_id, s.customer_key FROM dq_sales s LEFT JOIN dim_customer c ON c.customer_key = s.customer_key WHERE c.customer_key IS NULL LIMIT 10;"),
      step("Shape one quality test query", "Each named test returns one row: test name and failure count. Zero failures means that rule passed, not that the batch is perfect.", "SELECT 'duplicate_line_ids' AS test, COUNT(*) AS failures\nFROM (SELECT line_id FROM dq_sales GROUP BY line_id HAVING COUNT(*) > 1);"),
    ],
  }),
  82: warehouse({
    decision: "MIGRATE", reason: "Durable surrogate keys in the Retail customer master.",
    concept: "A surrogate key identifies a row inside the warehouse and must never change once assigned, even when the natural key’s attributes change. Let the database assign new keys (INTEGER PRIMARY KEY) on insert, and update attributes in place without touching the key.",
    trap: "Rebuilding the table with ROW_NUMBER() renumbers existing customers whenever a new one sorts before them, breaking every fact row that stored the old key.",
    grain: "One row per customer in the master.",
    example: "SELECT customer_key, customer_id, contact_name\nFROM current_people\nORDER BY customer_key\nLIMIT 10;",
    hints: ["INSERT INTO current_people (customer_id, contact_name, updated_at) VALUES (…) — leave customer_key out.", "UPDATE current_people SET contact_name = … WHERE customer_id = …"],
    tasks: [
      task("Insert customer 'N0001' named 'Ines Duarte' updated '2011-12-08 09:00:00' into current_people without supplying customer_key. Return customer_id and customer_key for all rows.", "INSERT INTO current_people (customer_id, contact_name, updated_at) VALUES ('N0001', 'Ines Duarte', '2011-12-08 09:00:00'); SELECT customer_id, customer_key FROM current_people", { required: ["INSERT"], stateQueries: ["SELECT customer_key, customer_id FROM current_people ORDER BY customer_key"] }),
      task("Change the contact_name of the customer with customer_key 2 to 'Account Desk' without changing any key. Return customer_id, customer_key and contact_name for all rows.", "UPDATE current_people SET contact_name = 'Account Desk' WHERE customer_key = 2; SELECT customer_id, customer_key, contact_name FROM current_people", { required: ["UPDATE"], stateQueries: ["SELECT customer_key, customer_id, contact_name FROM current_people ORDER BY customer_key"] }),
    ],
    quiz: quiz("Why must a surrogate key never change?", ["It is the primary key", "Facts store it; changing it breaks their link to the customer", "SQLite forbids it"], 1, "Fact rows reference the key, so it must be stable across loads."),
    walkthrough: [
      step("Browse assigned surrogate keys", "customer_key is stable warehouse identity; customer_id is the business natural key you load and update.", "SELECT customer_key, customer_id, contact_name FROM current_people ORDER BY customer_key LIMIT 10;"),
      step("Insert without supplying a key", "INTEGER PRIMARY KEY assigns the next customer_key automatically when you omit it from INSERT.", "INSERT INTO current_people (customer_id, contact_name, updated_at) VALUES ('N0009', 'Test Contact', '2011-12-08 09:00:00');\nSELECT customer_key, customer_id FROM current_people ORDER BY customer_key DESC LIMIT 3;"),
      step("Update a name, keep the key", "Changing contact_name does not change customer_key—facts that stored the old key still point at the same customer.", "UPDATE current_people SET contact_name = contact_name || ' (verified)' WHERE customer_key = 1;\nSELECT customer_key, customer_id, contact_name FROM current_people WHERE customer_key = 1;"),
    ],
  }),
  83: warehouse({
    decision: "MIGRATE", reason: "Latest-state versus type-2 history on the canonical Retail customer_history table.",
    concept: "A latest-state table keeps only the current value of each attribute; a type-2 history keeps every version with a validity interval. Reports about “now” use the current version; reports about the past join each fact to the version valid on its date.",
    trap: "Joining facts to every history version without a date condition repeats each sale once per version.",
    grain: "One row per customer, then one row per sale line.",
    example: "SELECT customer_id, segment, country, valid_from, valid_to, is_current\nFROM customer_history\nWHERE customer_id = 12359\nORDER BY valid_from;",
    hints: ["is_current = 1 selects the latest version.", "Join on the customer and h.valid_from <= s.order_date AND (h.valid_to IS NULL OR s.order_date < h.valid_to)."],
    tasks: [
      task("Return customer_id, segment and country for the current version of every customer in customer_history.", "SELECT customer_id, segment, country FROM customer_history WHERE is_current = 1"),
      task("For fact_sales lines in December 2011, return sale_key, customer_id and segment_at_sale: the customer’s segment in the history version valid on the line’s order_date.", "SELECT s.sale_key, c.customer_id, h.segment AS segment_at_sale FROM fact_sales s JOIN dim_customer c ON c.customer_key = s.customer_key JOIN customer_history h ON h.customer_id = CAST(c.customer_id AS INTEGER) AND h.valid_from <= s.order_date AND (h.valid_to IS NULL OR s.order_date < h.valid_to) WHERE s.order_date >= '2011-12-01'"),
    ],
    quiz: quiz("A customer was 'regular' in March and 'key_account' since September. Which segment applies to a March sale in a historical report?", ["key_account", "regular", "Both"], 1, "Historical reports use the version valid at the time of the sale."),
    walkthrough: [
      step("Walk one customer’s history intervals", "Each row is a type-2 version with valid_from, valid_to, and is_current—half-open intervals avoid double-counting boundary days.", "SELECT customer_id, segment, country, valid_from, valid_to, is_current FROM customer_history WHERE customer_id = 12359 ORDER BY valid_from;"),
      step("See how many versions customers have", "The distribution shows how often segment or country changed—historical reports must join facts to the right version, not every row.", "SELECT versions, COUNT(*) AS customers FROM (SELECT customer_id, COUNT(*) AS versions FROM customer_history GROUP BY customer_id) GROUP BY versions;"),
      step("Pick the version valid on a date", "For 2011-06-01 on customer 12359, valid_from <= date and date < valid_to (or NULL end) returns exactly one segment.", "SELECT customer_id, segment, valid_from, valid_to\nFROM customer_history\nWHERE customer_id = 12359 AND valid_from <= '2011-06-01' AND (valid_to IS NULL OR '2011-06-01' < valid_to);"),
    ],
  }),
  84: warehouse({
    decision: "MIGRATE", reason: "Idempotent UPSERT of the Retail customer change batch.",
    concept: "An incremental load inserts new keys and updates existing ones in one statement: INSERT … ON CONFLICT(customer_id) DO UPDATE SET … . Guard the update with WHERE excluded.updated_at > current_people.updated_at so stale records cannot overwrite newer data, and the same batch can be applied twice with the same result.",
    trap: "Without the timestamp guard, replaying an old record overwrites a newer value; without ON CONFLICT, rerunning the batch fails on duplicate keys.",
    grain: "One row per customer in the master.",
    example: "SELECT i.customer_id, i.updated_at AS incoming, c.updated_at AS current\nFROM incoming_people i LEFT JOIN current_people c ON c.customer_id = i.customer_id;",
    hints: ["INSERT INTO current_people (customer_id, contact_name, updated_at) SELECT customer_id, contact_name, updated_at FROM incoming_people WHERE true ON CONFLICT(customer_id) DO UPDATE SET … WHERE excluded.updated_at > current_people.updated_at.", "SQLite needs WHERE true after a SELECT in an UPSERT to disambiguate ON CONFLICT."],
    tasks: [
      task("Apply incoming_people to current_people with INSERT … ON CONFLICT(customer_id) DO UPDATE, updating contact_name and updated_at only when the incoming updated_at is newer. Apply the same statement twice. Return customer_id, contact_name and updated_at for all rows.", "INSERT INTO current_people (customer_id, contact_name, updated_at) SELECT customer_id, contact_name, updated_at FROM incoming_people WHERE true ON CONFLICT(customer_id) DO UPDATE SET contact_name = excluded.contact_name, updated_at = excluded.updated_at WHERE excluded.updated_at > current_people.updated_at; INSERT INTO current_people (customer_id, contact_name, updated_at) SELECT customer_id, contact_name, updated_at FROM incoming_people WHERE true ON CONFLICT(customer_id) DO UPDATE SET contact_name = excluded.contact_name, updated_at = excluded.updated_at WHERE excluded.updated_at > current_people.updated_at; SELECT customer_id, contact_name, updated_at FROM current_people", { required: ["INSERT", "ON CONFLICT", "DO UPDATE"], repeatCheck: true, stateQueries: ["SELECT customer_key, customer_id, contact_name, updated_at FROM current_people ORDER BY customer_key"] }),
      task("Apply the same UPSERT once and return customer_id and customer_key for all rows, showing that existing keys stayed the same.", "INSERT INTO current_people (customer_id, contact_name, updated_at) SELECT customer_id, contact_name, updated_at FROM incoming_people WHERE true ON CONFLICT(customer_id) DO UPDATE SET contact_name = excluded.contact_name, updated_at = excluded.updated_at WHERE excluded.updated_at > current_people.updated_at; SELECT customer_id, customer_key FROM current_people", { required: ["INSERT", "ON CONFLICT", "DO UPDATE"], stateQueries: ["SELECT customer_key, customer_id, contact_name, updated_at FROM current_people ORDER BY customer_key"] }),
    ],
    quiz: quiz("An incoming record is older than the stored one. What should an idempotent UPSERT do?", ["Overwrite it", "Leave the stored record unchanged", "Insert a duplicate"], 1, "The timestamp guard keeps newer data; replaying the batch changes nothing."),
    walkthrough: [
      step("Compare incoming with current timestamps", "Side-by-side updated_at values show new keys, stale replays, and rows that should win on conflict.", "SELECT i.customer_id, i.updated_at AS incoming, c.updated_at AS current FROM incoming_people i LEFT JOIN current_people c ON c.customer_id = i.customer_id;"),
      step("Count keys that would conflict", "These incoming customer_ids already exist—rerunning a plain INSERT would fail without ON CONFLICT.", "SELECT COUNT(*) AS would_conflict FROM incoming_people i JOIN current_people c ON c.customer_id = i.customer_id;"),
      step("See which incoming rows are newer", "The newer flag is the UPSERT guard: only when incoming updated_at beats current should contact_name and updated_at change.", "SELECT i.customer_id, i.updated_at AS incoming, c.updated_at AS current, i.updated_at > c.updated_at AS newer\nFROM incoming_people i\nJOIN current_people c ON c.customer_id = i.customer_id;"),
    ],
  }),
  85: warehouse({
    decision: "MIGRATE", reason: "Atomic promotion of a staged Retail report refresh.",
    concept: "Refresh a published table in a transaction: BEGIN, delete the old rows, insert the staged rows, then COMMIT. Readers see either the old snapshot or the new one, never a half-empty table. If anything fails before COMMIT, ROLLBACK leaves the old snapshot intact.",
    trap: "Deleting and inserting without a transaction leaves an empty or partial table if the insert fails.",
    grain: "One row per customer total.",
    example: "SELECT p.customer_id, p.total_sales AS published, s.total_sales AS staged\nFROM published_totals p LEFT JOIN refresh_stage s ON s.customer_id = p.customer_id;",
    hints: ["BEGIN; DELETE FROM published_totals; INSERT INTO published_totals SELECT … FROM refresh_stage; ROLLBACK;", "Replace ROLLBACK with COMMIT to promote."],
    tasks: [
      task("Simulate an interrupted promotion: BEGIN, DELETE all published_totals, INSERT the refresh_stage rows, then ROLLBACK. Return customer_id and total_sales from published_totals (the November snapshot must remain).", "BEGIN; DELETE FROM published_totals; INSERT INTO published_totals SELECT customer_id, total_sales FROM refresh_stage; ROLLBACK; SELECT customer_id, total_sales FROM published_totals", { required: ["BEGIN", "DELETE", "INSERT", "ROLLBACK"], stateQueries: ["SELECT customer_id, total_sales FROM published_totals ORDER BY customer_id"] }),
      task("Promote the staged refresh in one transaction: BEGIN, DELETE the old rows, INSERT the staged rows, COMMIT. Return customer_id and total_sales from published_totals.", "BEGIN; DELETE FROM published_totals; INSERT INTO published_totals SELECT customer_id, total_sales FROM refresh_stage; COMMIT; SELECT customer_id, total_sales FROM published_totals", { required: ["BEGIN", "DELETE", "INSERT", "COMMIT"], stateQueries: ["SELECT customer_id, total_sales FROM published_totals ORDER BY customer_id"] }),
    ],
    quiz: quiz("A refresh deletes old rows, then the insert fails. With a transaction and ROLLBACK, what do readers see?", ["An empty table", "The old snapshot", "Half the new rows"], 1, "ROLLBACK undoes the delete as well."),
    walkthrough: [
      step("Compare published and staged totals", "published_totals is what readers see today; refresh_stage holds the next snapshot before you promote it in a transaction.", "SELECT p.customer_id, p.total_sales AS published, s.total_sales AS staged FROM published_totals p LEFT JOIN refresh_stage s ON s.customer_id = p.customer_id;"),
      step("Validate the stage before promotion", "Check row count, null keys, and negative totals on refresh_stage so you do not commit a bad refresh.", "SELECT COUNT(*) AS rows, SUM(customer_id IS NULL) AS missing_keys, SUM(total_sales < 0) AS negative_totals FROM refresh_stage;"),
      step("Confirm rollback leaves data intact", "DELETE inside BEGIN is undone by ROLLBACK—staged_rows should match the count before the failed experiment.", "BEGIN;\nDELETE FROM refresh_stage;\nROLLBACK;\nSELECT COUNT(*) AS staged_rows FROM refresh_stage;"),
    ],
  }),
  86: warehouse({
    decision: "MIGRATE", reason: "Fact grain protection when joining Retail facts to customer history.",
    concept: "Joining a fact table to a type-2 history must match exactly one version per fact row. Use either the current version (is_current = 1) for “as now” reporting or the version valid on the fact date for “as then” reporting. Both preserve the fact grain; joining to all versions does not.",
    trap: "A join on customer only repeats each sale once per version and inflates totals.",
    grain: "One row per country.",
    example: "SELECT COUNT(*) AS fact_rows,\n  (SELECT COUNT(*) FROM fact_sales s JOIN dim_customer c ON c.customer_key = s.customer_key JOIN customer_history h ON h.customer_id = CAST(c.customer_id AS INTEGER)) AS joined_to_all_versions\nFROM fact_sales;",
    hints: ["Current: AND h.is_current = 1.", "As then: AND h.valid_from <= s.order_date AND (h.valid_to IS NULL OR s.order_date < h.valid_to)."],
    tasks: [
      task("Return country and total_sales (rounded to 2) for all 2011 fact_sales lines, using each customer’s current customer_history version.", "SELECT h.country, ROUND(SUM(s.sales), 2) AS total_sales FROM fact_sales s JOIN dim_customer c ON c.customer_key = s.customer_key JOIN customer_history h ON h.customer_id = CAST(c.customer_id AS INTEGER) AND h.is_current = 1 GROUP BY h.country"),
      task("Return country and total_sales (rounded to 2), this time using the customer_history version valid on each line’s order_date.", "SELECT h.country, ROUND(SUM(s.sales), 2) AS total_sales FROM fact_sales s JOIN dim_customer c ON c.customer_key = s.customer_key JOIN customer_history h ON h.customer_id = CAST(c.customer_id AS INTEGER) AND h.valid_from <= s.order_date AND (h.valid_to IS NULL OR s.order_date < h.valid_to) GROUP BY h.country"),
    ],
    quiz: quiz("A customer has 3 history versions. Joining their 10 sales on customer only produces how many rows?", ["10", "13", "30"], 2, "Each sale matches all three versions."),
    walkthrough: [
      step("See row inflation without a date filter", "Joining every history version to every sale multiplies fact_rows—totals would be wrong if you stopped here.", "SELECT COUNT(*) AS fact_rows, (SELECT COUNT(*) FROM fact_sales s JOIN dim_customer c ON c.customer_key = s.customer_key JOIN customer_history h ON h.customer_id = CAST(c.customer_id AS INTEGER)) AS joined_to_all_versions FROM fact_sales;"),
      step("Count rows with current-version join", "Filtering to is_current = 1 matches one history row per customer, so the join count stays equal to fact_sales.", "SELECT COUNT(*) AS current_join FROM fact_sales s JOIN dim_customer c ON c.customer_key = s.customer_key JOIN customer_history h ON h.customer_id = CAST(c.customer_id AS INTEGER) AND h.is_current = 1;"),
      step("Count rows with as-of-date join", "Matching valid_from and valid_to to each line’s order_date also preserves one row per sale for historical reporting.", "SELECT COUNT(*) AS as_of_join\nFROM fact_sales s\nJOIN dim_customer c ON c.customer_key = s.customer_key\nJOIN customer_history h ON h.customer_id = CAST(c.customer_id AS INTEGER)\n  AND h.valid_from <= s.order_date AND (h.valid_to IS NULL OR s.order_date < h.valid_to);"),
    ],
  }),
  87: warehouse({
    decision: "MIGRATE", reason: "Capstone: integrated Retail customers joined to quality-gated December sales.",
    concept: "The capstone chains the warehouse steps: integrate CRM and ERP customers under the contract (lesson 77), build quality-gated sales from Bronze (lesson 71), then report trusted sales at the integrated customer grain. Each step is materialized so it can be inspected and reconciled.",
    trap: "Joining Bronze sales to integrated customers before applying the quality gates lets invalid lines into the report.",
    grain: "One row per integrated customer, then one row per country.",
    example: "SELECT COUNT(*) AS bronze_lines, COUNT(DISTINCT TRIM(customer_id)) AS customers FROM bronze_sales;",
    hints: ["CREATE TEMP TABLE integrated_customers AS <lesson 77 contract>; CREATE TEMP TABLE built_sales AS <lesson 71 gates>.", "Join built_sales to dim_customer for the natural key, then to integrated_customers."],
    tasks: [
      task("Create TEMP table integrated_customers (lesson 77 contract) and TEMP table built_sales (lesson 71 quality gates: customer_key, product_key, quantity, sales, order_date). Return customer_id, contact_name, country, sales_lines and total_sales (rounded to 2) for integrated customers with at least one accepted December line.", `CREATE TEMP TABLE integrated_customers AS ${INTEGRATED} ${INTEGRATED_SELECT}; CREATE TEMP TABLE built_sales AS SELECT c.customer_key, p.product_key, CAST(TRIM(b.quantity) AS INTEGER) AS quantity, ROUND(CAST(TRIM(b.quantity) AS INTEGER) * p.price, 2) AS sales, b.order_date FROM bronze_sales b JOIN dim_customer c ON c.customer_id = TRIM(b.customer_id) JOIN dim_product p ON p.product_id = TRIM(b.product_id) WHERE ${VALID_SALE}; SELECT i.customer_id, i.contact_name, i.country, COUNT(*) AS sales_lines, ROUND(SUM(s.sales), 2) AS total_sales FROM built_sales s JOIN dim_customer d ON d.customer_key = s.customer_key JOIN integrated_customers i ON i.customer_id = d.customer_id GROUP BY i.customer_id, i.contact_name, i.country`, { validate: [
        { sql: "SELECT COUNT(*) FROM sqlite_temp_schema WHERE type = 'table' AND name IN ('integrated_customers', 'built_sales')", value: 2 },
      ] }),
      task("Create the same two TEMP tables. Return country and total_sales (rounded to 2) for every country of an integrated customer, with 0 for countries whose customers had no accepted December sales.", `CREATE TEMP TABLE integrated_customers AS ${INTEGRATED} ${INTEGRATED_SELECT}; CREATE TEMP TABLE built_sales AS SELECT c.customer_key, p.product_key, CAST(TRIM(b.quantity) AS INTEGER) AS quantity, ROUND(CAST(TRIM(b.quantity) AS INTEGER) * p.price, 2) AS sales, b.order_date FROM bronze_sales b JOIN dim_customer c ON c.customer_id = TRIM(b.customer_id) JOIN dim_product p ON p.product_id = TRIM(b.product_id) WHERE ${VALID_SALE}; SELECT i.country, ROUND(COALESCE(SUM(s.sales), 0), 2) AS total_sales FROM integrated_customers i LEFT JOIN dim_customer d ON d.customer_id = i.customer_id LEFT JOIN built_sales s ON s.customer_key = d.customer_key GROUP BY i.country`, { validate: [
        { sql: "SELECT COUNT(*) FROM sqlite_temp_schema WHERE type = 'table' AND name IN ('integrated_customers', 'built_sales')", value: 2 },
      ] }),
    ],
    quiz: quiz("Why materialize integrated_customers and built_sales as separate steps?", ["It is required by SQLite", "Each step can be inspected and reconciled on its own", "It makes the query shorter"], 1, "Intermediate tables are checkpoints for quality and reconciliation."),
    walkthrough: [
      step("Size the raw Bronze batch", "bronze_lines and distinct customers describe December sales before quality gates or integration—your capstone checkpoints start here.", "SELECT COUNT(*) AS bronze_lines, COUNT(DISTINCT TRIM(customer_id)) AS customers FROM bronze_sales;"),
      step("Count CRM customers missing ERP", "The integration contract keeps every keyed CRM row; without_erp shows how many have no matching ERP person.", `${INTEGRATED} SELECT COUNT(*) AS crm_customers, SUM(erp.customer_id IS NULL) AS without_erp FROM crm LEFT JOIN erp ON erp.customer_id = crm.customer_id;`),
      step("Map location codes to countries", "erp_locations joins country_codes so integrated customers get a resolved country, not raw ISO text alone.", "SELECT k.country, COUNT(*) AS locations\nFROM erp_locations e\nLEFT JOIN country_codes k ON k.code = UPPER(TRIM(e.country_code))\nGROUP BY k.country\nORDER BY locations DESC;"),
    ],
  }),
};
