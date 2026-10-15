/**
 * The Retail warehouse story (lessons 69–87). These scenario tables are derived from the canonical
 * Retail database when a warehouse lesson opens, so every lesson in the sequence shares one company,
 * one set of customers and one year of real sales. Defects in the raw (Bronze, CRM, ERP) feeds are
 * injected deterministically by key arithmetic; contact names, genders and birth dates are modeled.
 */
const FIRST = ["Amelia", "Oliver", "Isla", "George", "Ava", "Noah", "Mia", "Arthur", "Grace", "Leo", "Freya", "Oscar", "Lily", "Harry", "Emily", "Jack", "Sophie", "Henry", "Chloe", "Theo"];
const LAST = ["Smith", "Jones", "Taylor", "Brown", "Williams", "Wilson", "Johnson", "Davies", "Patel", "Wright", "Walker", "Evans", "Hughes", "Green", "Hall", "Wood", "Clarke", "Turner", "Hill", "Moore"];
const NAMES = `WITH f(i, name) AS (VALUES ${FIRST.map((n, i) => `(${i}, '${n}')`).join(", ")}), l(i, name) AS (VALUES ${LAST.map((n, i) => `(${i}, '${n}')`).join(", ")})`;
const COUNTRY_CODES: Array<[string, string]> = [
  ["AE", "United Arab Emirates"], ["AT", "Austria"], ["AU", "Australia"], ["BE", "Belgium"], ["BH", "Bahrain"], ["BR", "Brazil"], ["CH", "Switzerland"],
  ["CY", "Cyprus"], ["DE", "Germany"], ["DK", "Denmark"], ["ES", "Spain"], ["FI", "Finland"], ["FR", "France"], ["GB", "United Kingdom"], ["GR", "Greece"],
  ["IE", "EIRE"], ["IL", "Israel"], ["IS", "Iceland"], ["IT", "Italy"], ["JE", "Channel Islands"], ["JP", "Japan"], ["NG", "Nigeria"], ["NL", "Netherlands"],
  ["PL", "Poland"], ["PT", "Portugal"], ["SE", "Sweden"],
];

export const RETAIL_WAREHOUSE = `
-- Reference data: ISO country codes used by the ERP feed (several countries have no code).
CREATE TABLE country_codes (code TEXT PRIMARY KEY, country TEXT NOT NULL);
INSERT INTO country_codes VALUES ${COUNTRY_CODES.map(([c, n]) => `('${c}', '${n}')`).join(", ")};

-- Gold: trusted star schema for 2011 sales by identified customers.
CREATE TABLE dim_customer (customer_key INTEGER PRIMARY KEY, customer_id TEXT NOT NULL UNIQUE, contact_name TEXT, country TEXT, region TEXT);
INSERT INTO dim_customer ${NAMES} SELECT ROW_NUMBER() OVER (ORDER BY c.customer_id), CAST(c.customer_id AS TEXT), f.name || ' ' || l.name, c.country, c.region FROM customers c JOIN f ON f.i = c.customer_id % 20 JOIN l ON l.i = (c.customer_id / 20) % 20;
CREATE TABLE dim_product (product_key INTEGER PRIMARY KEY, product_id TEXT NOT NULL UNIQUE, description TEXT, category TEXT, price REAL NOT NULL);
INSERT INTO dim_product SELECT ROW_NUMBER() OVER (ORDER BY p.stock_code), p.stock_code, p.description, c.category_name, p.list_price FROM products p LEFT JOIN categories c ON c.category_id = p.category_id WHERE p.is_merchandise = 1 AND p.list_price IS NOT NULL;
CREATE TABLE fact_sales (sale_key INTEGER PRIMARY KEY, order_id INTEGER NOT NULL, customer_key INTEGER NOT NULL REFERENCES dim_customer(customer_key), product_key INTEGER NOT NULL REFERENCES dim_product(product_key), order_date TEXT NOT NULL, quantity INTEGER NOT NULL, sales REAL NOT NULL);
INSERT INTO fact_sales SELECT i.order_item_id, o.order_id, c.customer_key, p.product_key, date(o.ordered_at), i.quantity, ROUND(i.quantity * i.unit_price, 2) FROM order_items i JOIN orders o ON o.order_id = i.order_id JOIN dim_customer c ON c.customer_id = CAST(o.customer_id AS TEXT) JOIN dim_product p ON p.product_id = i.stock_code WHERE o.order_type = 'sale' AND i.quantity > 0 AND o.ordered_at >= '2011-01-01' AND o.ordered_at < '2012-01-01';
CREATE INDEX idx_fact_sales_customer ON fact_sales(customer_key);
CREATE INDEX idx_fact_sales_date ON fact_sales(order_date);

-- Bronze: raw customer extract, one row per source version, with untrimmed keys, mixed country codes and missing keys.
CREATE TABLE bronze_customers (raw_id TEXT, name TEXT, country TEXT, updated_at TEXT);
INSERT INTO bronze_customers ${NAMES} SELECT CASE WHEN h.history_id % 9 = 0 THEN ' ' || h.customer_id WHEN h.history_id % 11 = 0 THEN h.customer_id || '  ' ELSE CAST(h.customer_id AS TEXT) END,
  CASE WHEN h.history_id % 7 = 0 THEN ' ' || upper(f.name || ' ' || l.name) ELSE f.name || ' ' || l.name END,
  CASE WHEN h.country = 'United Kingdom' THEN CASE h.history_id % 4 WHEN 0 THEN 'UK' WHEN 1 THEN 'GB' WHEN 2 THEN ' united kingdom ' ELSE 'United Kingdom' END
       WHEN h.country = 'Germany' AND h.history_id % 2 = 0 THEN 'DE' WHEN h.country = 'France' AND h.history_id % 2 = 0 THEN 'FR' WHEN h.country = 'Spain' AND h.history_id % 2 = 0 THEN 'ES' ELSE h.country END,
  h.valid_from || ' 09:00:00'
FROM customer_history h JOIN f ON f.i = h.customer_id % 20 JOIN l ON l.i = (h.customer_id / 20) % 20;
INSERT INTO bronze_customers VALUES (NULL, 'Walk-in Trade Counter', 'UK', '2011-03-01 09:00:00'), ('', 'Unknown Online Buyer', 'GB', '2011-05-02 09:00:00'), ('   ', 'Test Account', 'UK', '2011-07-04 09:00:00'), (NULL, 'Sample Request', 'DE', '2011-09-05 09:00:00');

-- Bronze: December 2011 sales lines as text, with whitespace keys, unknown codes, bad quantities and bad dates.
CREATE TABLE bronze_sales (row_id INTEGER PRIMARY KEY, customer_id TEXT, product_id TEXT, quantity TEXT, sales TEXT, order_date TEXT);
INSERT INTO bronze_sales SELECT i.order_item_id,
  CASE WHEN i.order_item_id % 101 = 0 THEN 'C' || o.customer_id WHEN i.order_item_id % 13 = 0 THEN ' ' || o.customer_id || ' ' ELSE CAST(o.customer_id AS TEXT) END,
  CASE WHEN i.order_item_id % 97 = 0 THEN 'X' || i.stock_code ELSE i.stock_code END,
  CASE WHEN i.order_item_id % 89 = 0 THEN '' WHEN i.order_item_id % 83 = 0 THEN i.quantity || ' pcs' WHEN i.order_item_id % 79 = 0 THEN '-' || i.quantity WHEN i.order_item_id % 73 = 0 THEN '0' ELSE CAST(i.quantity AS TEXT) END,
  printf('%.2f', i.quantity * i.unit_price),
  CASE WHEN i.order_item_id % 71 = 0 THEN '2011-12-32' WHEN i.order_item_id % 67 = 0 THEN strftime('%d/%m/%Y', o.ordered_at) WHEN i.order_item_id % 61 = 0 THEN NULL ELSE date(o.ordered_at) END
FROM order_items i JOIN orders o ON o.order_id = i.order_id
WHERE o.order_type = 'sale' AND o.customer_id IS NOT NULL AND i.quantity > 0 AND o.ordered_at >= '2011-12-01';

-- Integration sources: CRM contact versions and ERP person/location records for the same customers.
CREATE TABLE crm_people (source_row INTEGER PRIMARY KEY, customer_id TEXT, contact_name TEXT, gender TEXT, updated_at TEXT);
INSERT INTO crm_people ${NAMES} SELECT ROW_NUMBER() OVER (ORDER BY h.history_id), CASE WHEN h.history_id % 17 = 0 THEN ' ' || h.customer_id ELSE CAST(h.customer_id AS TEXT) END, f.name || ' ' || l.name,
  CASE WHEN h.history_id % 5 = 0 AND h.is_current = 1 THEN '' WHEN h.customer_id % 7 IN (0, 1, 2) THEN 'F' WHEN h.customer_id % 7 IN (3, 4, 5) THEN 'M' ELSE 'n/a' END,
  h.valid_from || ' 10:00:00'
FROM customer_history h JOIN f ON f.i = h.customer_id % 20 JOIN l ON l.i = (h.customer_id / 20) % 20;
-- Same-timestamp corrections: source_row breaks the tie.
INSERT INTO crm_people (customer_id, contact_name, gender, updated_at) SELECT customer_id, upper(contact_name), gender, updated_at FROM crm_people WHERE CAST(customer_id AS INTEGER) % 50 = 0 AND source_row IN (SELECT MAX(source_row) FROM crm_people GROUP BY TRIM(customer_id));
INSERT INTO crm_people (customer_id, contact_name, gender, updated_at) VALUES (NULL, 'Imported Lead', 'F', '2011-04-01 10:00:00'), ('', 'Trade Show Contact', 'M', '2011-06-01 10:00:00'), ('  ', 'Duplicate Import', 'n/a', '2011-08-01 10:00:00');
CREATE TABLE erp_people (erp_id TEXT PRIMARY KEY, gender TEXT, birth_date TEXT);
INSERT INTO erp_people SELECT CASE WHEN customer_id % 3 = 0 THEN 'NAS' || customer_id ELSE CAST(customer_id AS TEXT) END,
  CASE WHEN customer_id % 11 = 0 THEN NULL WHEN customer_id % 7 IN (0, 1, 2, 6) THEN CASE WHEN customer_id % 2 = 0 THEN 'Female' ELSE 'female' END ELSE 'Male' END,
  CASE WHEN customer_id % 97 = 0 THEN '2031-05-01' WHEN customer_id % 89 = 0 THEN NULL ELSE printf('%04d-%02d-%02d', 1950 + customer_id % 47, 1 + customer_id % 12, 1 + customer_id % 28) END
FROM customers;
CREATE TABLE erp_locations (erp_id TEXT PRIMARY KEY, country_code TEXT);
INSERT INTO erp_locations SELECT substr(customer_id, 1, 2) || '-' || substr(customer_id, 3), k.code FROM customers c LEFT JOIN country_codes k ON k.country = c.country;
CREATE TABLE load_manifest (source_name TEXT PRIMARY KEY, expected_rows INTEGER NOT NULL);
INSERT INTO load_manifest SELECT 'CRM', COUNT(*) + 3 FROM crm_people UNION ALL SELECT 'ERP', COUNT(*) FROM erp_people;

-- Raw calendar values from a legacy export (YYYYMMDD text) with missing, malformed and impossible dates.
CREATE TABLE raw_dates (row_id INTEGER PRIMARY KEY, raw_date TEXT);
INSERT INTO raw_dates SELECT order_id, CASE WHEN order_id % 9 = 0 THEN CASE (order_id / 9) % 6 WHEN 0 THEN '20111131' WHEN 1 THEN strftime('%Y-%m-%d', ordered_at) WHEN 2 THEN NULL WHEN 3 THEN '201112' WHEN 4 THEN '20110229' ELSE '20111301' END ELSE strftime('%Y%m%d', ordered_at) END FROM orders WHERE ordered_at >= '2011-11-01';

-- A batch awaiting publication, seeded with duplicates, orphan keys and invalid quantities.
CREATE TABLE dq_sales (line_id INTEGER, customer_key INTEGER, product_key INTEGER, quantity INTEGER, sales REAL);
INSERT INTO dq_sales SELECT sale_key, CASE WHEN sale_key % 211 = 0 THEN 999999 ELSE customer_key END, CASE WHEN sale_key % 223 = 0 THEN 999999 ELSE product_key END, CASE WHEN sale_key % 97 = 0 THEN NULL WHEN sale_key % 89 = 0 THEN 0 WHEN sale_key % 83 = 0 THEN -quantity ELSE quantity END, sales FROM fact_sales WHERE order_date >= '2011-12-01';
INSERT INTO dq_sales SELECT * FROM dq_sales WHERE line_id % 59 = 0;

-- Modeled unit cost versions for the 40 best-selling products (half-open validity starting at valid_from).
CREATE TABLE product_versions (version_id INTEGER PRIMARY KEY, product_id TEXT NOT NULL, cost REAL NOT NULL, valid_from TEXT NOT NULL);
INSERT INTO product_versions (product_id, cost, valid_from)
WITH top AS (SELECT p.product_id, p.price, p.product_key FROM fact_sales s JOIN dim_product p ON p.product_key = s.product_key GROUP BY p.product_key ORDER BY COUNT(*) DESC, p.product_key LIMIT 40)
SELECT product_id, ROUND(price * 0.42, 2), '2010-01-01' FROM top
UNION ALL SELECT product_id, ROUND(price * 0.45, 2), '2011-03-01' FROM top WHERE product_key % 2 = 0
UNION ALL SELECT product_id, ROUND(price * 0.44, 2), '2011-06-15' FROM top WHERE product_key % 5 = 0
UNION ALL SELECT product_id, ROUND(price * 0.47, 2), '2011-09-15' FROM top WHERE product_key % 3 = 0
ORDER BY 1, 3;

-- Current customer master with durable surrogate keys, and an incoming change batch (newer, stale and new).
CREATE TABLE current_people (customer_key INTEGER PRIMARY KEY, customer_id TEXT NOT NULL UNIQUE, contact_name TEXT, updated_at TEXT NOT NULL);
INSERT INTO current_people SELECT customer_key, customer_id, contact_name, '2011-11-30 18:00:00' FROM dim_customer WHERE customer_key <= 40;
CREATE TABLE incoming_people (customer_id TEXT, contact_name TEXT, updated_at TEXT);
INSERT INTO incoming_people SELECT customer_id, contact_name || ' (updated)', '2011-12-05 08:00:00' FROM current_people WHERE customer_key IN (3, 8, 15, 22);
INSERT INTO incoming_people SELECT customer_id, contact_name || ' (stale)', '2011-11-15 08:00:00' FROM current_people WHERE customer_key IN (5, 30);
INSERT INTO incoming_people VALUES ('N1001', 'Rosa Lindqvist', '2011-12-05 08:00:00'), ('N1002', 'Kenji Mori', '2011-12-06 08:00:00');

-- Published report snapshot (November) and a staged refresh (December) for the top customers.
CREATE TABLE published_totals (customer_id TEXT PRIMARY KEY, total_sales REAL NOT NULL);
INSERT INTO published_totals SELECT c.customer_id, ROUND(SUM(s.sales), 2) FROM fact_sales s JOIN dim_customer c ON c.customer_key = s.customer_key WHERE s.order_date >= '2011-11-01' AND s.order_date < '2011-12-01' GROUP BY c.customer_id ORDER BY SUM(s.sales) DESC LIMIT 15;
CREATE TABLE refresh_stage (customer_id TEXT, total_sales REAL);
INSERT INTO refresh_stage SELECT c.customer_id, ROUND(SUM(s.sales), 2) FROM fact_sales s JOIN dim_customer c ON c.customer_key = s.customer_key WHERE s.order_date >= '2011-12-01' GROUP BY c.customer_id ORDER BY SUM(s.sales) DESC LIMIT 15;
`;

/** Changed-data probes specific to the warehouse scenario tables. */
export const RETAIL_WAREHOUSE_MUTATION = `
UPDATE fact_sales SET quantity = quantity + 2, sales = ROUND(sales * (quantity + 2) / quantity, 2) WHERE sale_key % 37 = 0;
DELETE FROM fact_sales WHERE sale_key % 101 = 0;
INSERT INTO bronze_customers VALUES ('12347 ', 'Late Version', 'DE', '2011-12-09 09:00:00');
UPDATE bronze_sales SET quantity = 'twelve' WHERE row_id % 41 = 0;
UPDATE bronze_sales SET order_date = '2011-02-30' WHERE row_id % 43 = 0;
INSERT INTO crm_people (customer_id, contact_name, gender, updated_at) SELECT customer_id, contact_name || ' Jr', 'M', '2011-12-10 10:00:00' FROM crm_people WHERE source_row % 97 = 0;
UPDATE erp_people SET birth_date = '2012-01-01' WHERE rowid % 53 = 0;
INSERT INTO raw_dates VALUES (900001, '20111230'), (900002, '2011123'), (900003, '20111231');
INSERT INTO dq_sales SELECT line_id + 1000000, customer_key, product_key, -1, sales FROM dq_sales WHERE line_id % 67 = 0;
INSERT INTO product_versions (product_id, cost, valid_from) SELECT product_id, ROUND(cost * 1.1, 2), '2011-06-01' FROM product_versions WHERE version_id % 4 = 0;
INSERT INTO incoming_people VALUES ('N1003', 'Ana Ruiz', '2011-12-07 08:00:00');
UPDATE refresh_stage SET total_sales = total_sales + 100 WHERE rowid % 3 = 0;
INSERT INTO crm_people (customer_id, contact_name, gender, updated_at) VALUES (NULL, 'Late Import', 'F', '2011-12-09 10:00:00');
INSERT INTO current_people (customer_id, contact_name, updated_at) VALUES ('N0500', 'Probe Contact', '2011-12-01 00:00:00');
UPDATE current_people SET contact_name = contact_name || ' Jr' WHERE customer_key = 7;
UPDATE published_totals SET total_sales = total_sales + 1 WHERE rowid % 2 = 0;
`;
