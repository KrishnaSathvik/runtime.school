import type { CanonicalDatasetId } from "@/data/datasets/learning-map";

/**
 * One concept, three dialects. Every example is written against a canonical dataset's real tables.
 * `runs` says where the SQLite version runs: Playground (read-only) or Database Lab (writes).
 * Concepts without `runs` have no SQLite equivalent and are references only.
 */
export type SyntaxConcept = {
  id: string;
  title: string;
  purpose: string;
  difference: string;
  glance: { sqlite: string; postgres: string; sqlserver: string };
  examples: { sqlite: string; postgres: string; sqlserver: string };
  dataset: CanonicalDatasetId;
  runs?: "playground" | "lab";
};

export const SYNTAX_CONCEPTS: SyntaxConcept[] = [
  {
    id: "limit-output", title: "Limit output", dataset: "retail", runs: "playground",
    purpose: "Return a small, predictable set of rows: here, the five most recent invoices.",
    difference: "SQLite and PostgreSQL put LIMIT after ORDER BY. SQL Server puts TOP after SELECT. Ordering by a unique tie-breaker (order_id) makes the chosen rows predictable.",
    glance: { sqlite: "… ORDER BY … LIMIT 5", postgres: "LIMIT 5 or FETCH FIRST 5 ROWS ONLY", sqlserver: "SELECT TOP (5) … ORDER BY …" },
    examples: {
      sqlite: "SELECT order_id, invoice_no, ordered_at\nFROM orders\nORDER BY ordered_at DESC, order_id DESC\nLIMIT 5;",
      postgres: "SELECT order_id, invoice_no, ordered_at\nFROM orders\nORDER BY ordered_at DESC, order_id DESC\nLIMIT 5;",
      sqlserver: "SELECT TOP (5) order_id, invoice_no, ordered_at\nFROM orders\nORDER BY ordered_at DESC, order_id DESC;",
    },
  },
  {
    id: "monthly-bucket", title: "Monthly bucket", dataset: "flights", runs: "playground",
    purpose: "Group dates into calendar months for reporting: flights per month.",
    difference: "SQLite returns a text label such as '2025-02'. PostgreSQL and SQL Server truncate to the first instant of the month and return a date/time value. DATETRUNC requires SQL Server 2022 or later.",
    glance: { sqlite: "strftime('%Y-%m', flight_date)", postgres: "date_trunc('month', flight_date)", sqlserver: "DATETRUNC(month, flight_date)" },
    examples: {
      sqlite: "SELECT strftime('%Y-%m', flight_date) AS month,\n       COUNT(*) AS flights\nFROM flights\nGROUP BY month\nORDER BY month;",
      postgres: "SELECT date_trunc('month', flight_date) AS month,\n       COUNT(*) AS flights\nFROM flights\nGROUP BY 1\nORDER BY 1;",
      sqlserver: "SELECT DATETRUNC(month, flight_date) AS month,\n       COUNT(*) AS flights\nFROM flights\nGROUP BY DATETRUNC(month, flight_date)\nORDER BY month;",
    },
  },
  {
    id: "extract-date-part", title: "Extract part of a date", dataset: "sports", runs: "playground",
    purpose: "Pull one component out of a date: games by day of the week.",
    difference: "SQLite strftime('%w') returns text with Sunday = 0. PostgreSQL EXTRACT(DOW …) also uses Sunday = 0. SQL Server DATEPART(weekday …) depends on the SET DATEFIRST setting; with the U.S. default, Sunday = 1.",
    glance: { sqlite: "strftime('%w', game_date)", postgres: "EXTRACT(DOW FROM game_date)", sqlserver: "DATEPART(weekday, game_date)" },
    examples: {
      sqlite: "SELECT CAST(strftime('%w', game_date) AS INTEGER) AS weekday,\n       COUNT(*) AS games\nFROM games\nGROUP BY weekday\nORDER BY weekday;",
      postgres: "SELECT EXTRACT(DOW FROM game_date) AS weekday,\n       COUNT(*) AS games\nFROM games\nGROUP BY 1\nORDER BY 1;",
      sqlserver: "SELECT DATEPART(weekday, game_date) AS weekday,\n       COUNT(*) AS games\nFROM games\nGROUP BY DATEPART(weekday, game_date)\nORDER BY weekday;",
    },
  },
  {
    id: "add-seven-days", title: "Add seven days", dataset: "healthcare", runs: "playground",
    purpose: "Find the date one week after another: a follow-up one week after each appointment.",
    difference: "SQLite uses a text modifier and returns text. SQL Server uses DATEADD. PostgreSQL adds an interval and returns a timestamp.",
    glance: { sqlite: "datetime(scheduled_start, '+7 days')", postgres: "scheduled_start + INTERVAL '7 days'", sqlserver: "DATEADD(day, 7, scheduled_start)" },
    examples: {
      sqlite: "SELECT appointment_id, scheduled_start,\n       datetime(scheduled_start, '+7 days') AS follow_up\nFROM appointments\nORDER BY appointment_id\nLIMIT 5;",
      postgres: "SELECT appointment_id, scheduled_start,\n       scheduled_start + INTERVAL '7 days' AS follow_up\nFROM appointments\nORDER BY appointment_id\nLIMIT 5;",
      sqlserver: "SELECT TOP (5) appointment_id, scheduled_start,\n       DATEADD(day, 7, scheduled_start) AS follow_up\nFROM appointments\nORDER BY appointment_id;",
    },
  },
  {
    id: "days-between-dates", title: "Days between dates", dataset: "logistics", runs: "playground",
    purpose: "Count the days between two dates: how many days each shipment was promised in.",
    difference: "SQLite subtracts Julian day numbers, which gives a real number (fractional when times are included), so the start is truncated to a date first. SQL Server DATEDIFF counts day boundaries crossed. PostgreSQL subtracts one date from another and returns an integer.",
    glance: { sqlite: "julianday(b) - julianday(a)", postgres: "b::date - a::date", sqlserver: "DATEDIFF(day, a, b)" },
    examples: {
      sqlite: "SELECT shipment_id, created_at, promised_delivery_date,\n       CAST(julianday(promised_delivery_date)\n          - julianday(date(created_at)) AS INTEGER) AS days_promised\nFROM shipments\nORDER BY shipment_id\nLIMIT 5;",
      postgres: "SELECT shipment_id, created_at, promised_delivery_date,\n       promised_delivery_date - created_at::date AS days_promised\nFROM shipments\nORDER BY shipment_id\nLIMIT 5;",
      sqlserver: "SELECT TOP (5) shipment_id, created_at, promised_delivery_date,\n       DATEDIFF(day, created_at, promised_delivery_date) AS days_promised\nFROM shipments\nORDER BY shipment_id;",
    },
  },
  {
    id: "today-s-date", title: "Today's date", dataset: "healthcare", runs: "playground",
    purpose: "Compare data against the current date: days since each patient's latest visit.",
    difference: "SQLite date('now') and julianday('now') use UTC. SQL Server GETDATE() returns the server's local date and time. PostgreSQL CURRENT_DATE uses the session time zone and stays fixed for the whole transaction.",
    glance: { sqlite: "date('now')", postgres: "CURRENT_DATE", sqlserver: "CAST(GETDATE() AS date)" },
    examples: {
      sqlite: "SELECT patient_id,\n       MAX(start_at) AS last_visit,\n       CAST(julianday('now') - julianday(MAX(start_at)) AS INTEGER) AS days_since\nFROM encounters\nGROUP BY patient_id\nORDER BY last_visit DESC\nLIMIT 5;",
      postgres: "SELECT patient_id,\n       MAX(start_at) AS last_visit,\n       CURRENT_DATE - MAX(start_at)::date AS days_since\nFROM encounters\nGROUP BY patient_id\nORDER BY last_visit DESC\nLIMIT 5;",
      sqlserver: "SELECT TOP (5) patient_id,\n       MAX(start_at) AS last_visit,\n       DATEDIFF(day, MAX(start_at), CAST(GETDATE() AS date)) AS days_since\nFROM encounters\nGROUP BY patient_id\nORDER BY last_visit DESC;",
    },
  },
  {
    id: "safe-yyyymmdd-conversion", title: "Safe YYYYMMDD conversion", dataset: "flights", runs: "playground",
    purpose: "Turn compact YYYYMMDD text (as in many flight-data exports) into dates, rejecting impossible ones.",
    difference: "SQL Server TRY_CONVERT with style 112 returns NULL on failure. SQLite has no strict parser: date() rolls 2025-02-30 over into March, so the example checks the digits and that the date survives a round trip. PostgreSQL to_date raises an error on an impossible date, so validate the pattern first.",
    glance: { sqlite: "GLOB pattern + date() round trip", postgres: "pattern check, then to_date(x, 'YYYYMMDD')", sqlserver: "TRY_CONVERT(date, x, 112)" },
    examples: {
      sqlite: "WITH raw(fl_date) AS (\n  VALUES ('20250214'), ('20250230'), ('2025021x')\n)\nSELECT fl_date,\n       CASE\n         WHEN fl_date GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'\n          AND date(substr(fl_date, 1, 4) || '-' || substr(fl_date, 5, 2) || '-' || substr(fl_date, 7, 2))\n            = substr(fl_date, 1, 4) || '-' || substr(fl_date, 5, 2) || '-' || substr(fl_date, 7, 2)\n         THEN date(substr(fl_date, 1, 4) || '-' || substr(fl_date, 5, 2) || '-' || substr(fl_date, 7, 2))\n       END AS flight_date\nFROM raw;",
      postgres: "SELECT fl_date,\n       CASE WHEN fl_date ~ '^\\d{8}$'\n            THEN to_date(fl_date, 'YYYYMMDD')\n       END AS flight_date\nFROM (VALUES ('20250214'), ('2025021x')) AS raw(fl_date);\n-- to_date('20250230', 'YYYYMMDD') raises an error.",
      sqlserver: "SELECT fl_date,\n       TRY_CONVERT(date, fl_date, 112) AS flight_date\nFROM (VALUES ('20250214'), ('20250230'), ('2025021x')) AS raw(fl_date);",
    },
  },
  {
    id: "string-length", title: "String length", dataset: "retail", runs: "playground",
    purpose: "Count characters: the longest product descriptions.",
    difference: "SQLite length() and PostgreSQL length() count trailing spaces. SQL Server LEN() ignores trailing spaces (DATALENGTH counts bytes instead), so 'SQL ' has length 4 in SQLite and PostgreSQL but 3 in SQL Server.",
    glance: { sqlite: "length(description)", postgres: "length(description)", sqlserver: "LEN(description) · ignores trailing spaces" },
    examples: {
      sqlite: "SELECT stock_code, description,\n       length(description) AS characters\nFROM products\nWHERE description IS NOT NULL\nORDER BY characters DESC, stock_code\nLIMIT 5;",
      postgres: "SELECT stock_code, description,\n       length(description) AS characters\nFROM products\nWHERE description IS NOT NULL\nORDER BY characters DESC, stock_code\nLIMIT 5;",
      sqlserver: "SELECT TOP (5) stock_code, description,\n       LEN(description) AS characters\nFROM products\nWHERE description IS NOT NULL\nORDER BY characters DESC, stock_code;",
    },
  },
  {
    id: "concatenate-text", title: "Concatenate text", dataset: "healthcare", runs: "playground",
    purpose: "Join pieces of text into one value: a patient's full name and location.",
    difference: "SQLite and PostgreSQL use ||; SQL Server uses + between strings. Joining a NULL with the operator returns NULL in all three. CONCAT() skips NULLs in SQL Server and PostgreSQL, and SQLite 3.44+ has concat() too.",
    glance: { sqlite: "first_name || ' ' || last_name", postgres: "first_name || ' ' || last_name", sqlserver: "first_name + ' ' + last_name" },
    examples: {
      sqlite: "SELECT first_name || ' ' || last_name AS full_name,\n       concat(city, ', ', state) AS location\nFROM patients\nORDER BY patient_id\nLIMIT 5;",
      postgres: "SELECT first_name || ' ' || last_name AS full_name,\n       concat(city, ', ', state) AS location\nFROM patients\nORDER BY patient_id\nLIMIT 5;",
      sqlserver: "SELECT TOP (5) first_name + ' ' + last_name AS full_name,\n       CONCAT(city, ', ', state) AS location\nFROM patients\nORDER BY patient_id;",
    },
  },
  {
    id: "find-text-position", title: "Find text position", dataset: "saas", runs: "playground",
    purpose: "Find where one piece of text appears inside another: split users' emails at the @.",
    difference: "All three count from 1 and return 0 when nothing is found, but the argument order differs: SQLite instr(text, search), SQL Server CHARINDEX(search, text), PostgreSQL position(search IN text).",
    glance: { sqlite: "instr(email, '@')", postgres: "position('@' IN email)", sqlserver: "CHARINDEX('@', email)" },
    examples: {
      sqlite: "SELECT email,\n       instr(email, '@') AS at_position,\n       substr(email, instr(email, '@') + 1) AS domain\nFROM users\nORDER BY user_id\nLIMIT 5;",
      postgres: "SELECT email,\n       position('@' IN email) AS at_position,\n       substring(email FROM position('@' IN email) + 1) AS domain\nFROM users\nORDER BY user_id\nLIMIT 5;",
      sqlserver: "SELECT TOP (5) email,\n       CHARINDEX('@', email) AS at_position,\n       SUBSTRING(email, CHARINDEX('@', email) + 1, LEN(email)) AS domain\nFROM users\nORDER BY user_id;",
    },
  },
  {
    id: "case-insensitive-match", title: "Case-insensitive match", dataset: "retail", runs: "playground",
    purpose: "Find text regardless of case: product descriptions are stored in capitals, but 'heart' still matches.",
    difference: "SQLite LIKE ignores case for ASCII letters by default. SQL Server LIKE follows the column's collation; most default installations are case-insensitive. PostgreSQL LIKE is case-sensitive, so it adds ILIKE.",
    glance: { sqlite: "LIKE '%heart%'", postgres: "ILIKE '%heart%'", sqlserver: "LIKE '%heart%' · depends on collation" },
    examples: {
      sqlite: "SELECT stock_code, description\nFROM products\nWHERE description LIKE '%heart%'\nORDER BY stock_code\nLIMIT 5;",
      postgres: "SELECT stock_code, description\nFROM products\nWHERE description ILIKE '%heart%'\nORDER BY stock_code\nLIMIT 5;",
      sqlserver: "SELECT TOP (5) stock_code, description\nFROM products\nWHERE description LIKE '%heart%'\nORDER BY stock_code;",
    },
  },
  {
    id: "replace-null", title: "Replace NULL", dataset: "logistics", runs: "playground",
    purpose: "Choose a fallback when a value is missing: scans without an exception code.",
    difference: "COALESCE works in all three and returns the first non-NULL argument. SQL Server also has ISNULL with exactly two arguments and different type rules.",
    glance: { sqlite: "COALESCE(exception_code, 'none')", postgres: "COALESCE(exception_code, 'none')", sqlserver: "COALESCE(…) or ISNULL(exception_code, 'none')" },
    examples: {
      sqlite: "SELECT event_id, event_type,\n       COALESCE(exception_code, 'none') AS exception\nFROM tracking_events\nORDER BY event_id\nLIMIT 5;",
      postgres: "SELECT event_id, event_type,\n       COALESCE(exception_code, 'none') AS exception\nFROM tracking_events\nORDER BY event_id\nLIMIT 5;",
      sqlserver: "SELECT TOP (5) event_id, event_type,\n       ISNULL(exception_code, 'none') AS exception\nFROM tracking_events\nORDER BY event_id;",
    },
  },
  {
    id: "cast-types", title: "Cast between types", dataset: "retail", runs: "playground",
    purpose: "Convert text to a number, and see what each engine does when the text is not a number (cancellation invoices start with C).",
    difference: "SQLite CAST never fails: 'C489528' becomes 0. PostgreSQL raises an error for the same cast, so check the pattern first. SQL Server CAST also fails, while TRY_CAST returns NULL.",
    glance: { sqlite: "CAST(x AS INTEGER) · never fails", postgres: "x::integer · errors on bad input", sqlserver: "TRY_CAST(x AS int) · NULL on bad input" },
    examples: {
      sqlite: "SELECT order_id, invoice_no,\n       CAST(invoice_no AS INTEGER) AS invoice_number\nFROM orders\nWHERE order_id <= 3\nORDER BY order_id;",
      postgres: "SELECT order_id, invoice_no,\n       CASE WHEN invoice_no ~ '^\\d+$'\n            THEN invoice_no::integer\n       END AS invoice_number\nFROM orders\nWHERE order_id <= 3\nORDER BY order_id;",
      sqlserver: "SELECT order_id, invoice_no,\n       TRY_CAST(invoice_no AS int) AS invoice_number\nFROM orders\nWHERE order_id <= 3\nORDER BY order_id;",
    },
  },
  {
    id: "boolean-values", title: "Boolean values", dataset: "flights", runs: "playground",
    purpose: "Store and aggregate yes/no values: cancellation rates by airline.",
    difference: "SQLite has no boolean type: TRUE and FALSE are 1 and 0, and comparisons return 1 or 0, so they can be summed and averaged. PostgreSQL has a real boolean type; count with FILTER or cast to integer. SQL Server stores flags as bit and does not allow a comparison as a value, so it needs CASE.",
    glance: { sqlite: "AVG(cancelled = 1)", postgres: "AVG(cancelled::int) · COUNT(*) FILTER (WHERE cancelled)", sqlserver: "AVG(CASE WHEN cancelled = 1 THEN 1.0 ELSE 0 END)" },
    examples: {
      sqlite: "SELECT airline_code,\n       SUM(cancelled) AS cancelled_flights,\n       ROUND(AVG(cancelled = 1), 4) AS cancel_rate\nFROM flights\nGROUP BY airline_code\nORDER BY cancel_rate DESC\nLIMIT 5;",
      postgres: "SELECT airline_code,\n       COUNT(*) FILTER (WHERE cancelled) AS cancelled_flights,\n       ROUND(AVG(cancelled::int), 4) AS cancel_rate\nFROM flights\nGROUP BY airline_code\nORDER BY cancel_rate DESC\nLIMIT 5;",
      sqlserver: "SELECT TOP (5) airline_code,\n       SUM(CAST(cancelled AS int)) AS cancelled_flights,\n       ROUND(AVG(CASE WHEN cancelled = 1 THEN 1.0 ELSE 0 END), 4) AS cancel_rate\nFROM flights\nGROUP BY airline_code\nORDER BY cancel_rate DESC;",
    },
  },
  {
    id: "combine-values-per-group", title: "Combine values per group", dataset: "sports", runs: "playground",
    purpose: "Turn the rows of each group into one list: the clubs in each division.",
    difference: "SQLite uses group_concat, with ORDER BY inside the call from 3.44. SQL Server STRING_AGG (2017+) orders with WITHIN GROUP. PostgreSQL string_agg takes ORDER BY inside the call. Without an ORDER BY the list order is not guaranteed.",
    glance: { sqlite: "group_concat(team_id, ', ' ORDER BY team_id)", postgres: "string_agg(team_id, ', ' ORDER BY team_id)", sqlserver: "STRING_AGG(team_id, ', ') WITHIN GROUP (ORDER BY team_id)" },
    examples: {
      sqlite: "SELECT league, division,\n       group_concat(team_id, ', ' ORDER BY team_id) AS clubs\nFROM teams\nGROUP BY league, division\nORDER BY league, division;",
      postgres: "SELECT league, division,\n       string_agg(team_id, ', ' ORDER BY team_id) AS clubs\nFROM teams\nGROUP BY league, division\nORDER BY league, division;",
      sqlserver: "SELECT league, division,\n       STRING_AGG(team_id, ', ') WITHIN GROUP (ORDER BY team_id) AS clubs\nFROM teams\nGROUP BY league, division\nORDER BY league, division;",
    },
  },
  {
    id: "page-through-results", title: "Page through results", dataset: "developer", runs: "playground",
    purpose: "Show results one page at a time: pull requests 21 to 30.",
    difference: "SQLite and PostgreSQL use LIMIT with OFFSET. SQL Server (2012+) uses OFFSET … ROWS FETCH NEXT … ROWS ONLY, which requires ORDER BY. Order by a unique key so pages stay stable.",
    glance: { sqlite: "LIMIT 10 OFFSET 20", postgres: "LIMIT 10 OFFSET 20", sqlserver: "OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY" },
    examples: {
      sqlite: "SELECT pull_request_id, title, state\nFROM pull_requests\nORDER BY pull_request_id\nLIMIT 10 OFFSET 20;",
      postgres: "SELECT pull_request_id, title, state\nFROM pull_requests\nORDER BY pull_request_id\nLIMIT 10 OFFSET 20;",
      sqlserver: "SELECT pull_request_id, title, state\nFROM pull_requests\nORDER BY pull_request_id\nOFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY;",
    },
  },
  {
    id: "number-series", title: "Number series", dataset: "energy", runs: "playground",
    purpose: "Generate a sequence of numbers to find gaps: the hour missing on the day clocks spring forward.",
    difference: "SQLite and PostgreSQL write WITH RECURSIVE. SQL Server omits RECURSIVE and stops after 100 levels unless OPTION (MAXRECURSION n) raises the limit. PostgreSQL can also use generate_series(1, 24).",
    glance: { sqlite: "WITH RECURSIVE hours(h) AS (…)", postgres: "generate_series(1, 24)", sqlserver: "WITH hours(h) AS (…)" },
    examples: {
      sqlite: "WITH RECURSIVE hours(h) AS (\n  SELECT 1\n  UNION ALL\n  SELECT h + 1 FROM hours WHERE h < 24\n)\nSELECT h AS hour_number, COUNT(d.ba_code) AS reported\nFROM hours\nLEFT JOIN hourly_demand AS d\n  ON d.hour_number = h AND d.ba_code = 'ERCO' AND d.local_date = '2024-03-10'\nGROUP BY h\nORDER BY h;",
      postgres: "SELECT h AS hour_number, COUNT(d.ba_code) AS reported\nFROM generate_series(1, 24) AS h\nLEFT JOIN hourly_demand AS d\n  ON d.hour_number = h AND d.ba_code = 'ERCO' AND d.local_date = '2024-03-10'\nGROUP BY h\nORDER BY h;",
      sqlserver: "WITH hours(h) AS (\n  SELECT 1\n  UNION ALL\n  SELECT h + 1 FROM hours WHERE h < 24\n)\nSELECT h AS hour_number, COUNT(d.ba_code) AS reported\nFROM hours\nLEFT JOIN hourly_demand AS d\n  ON d.hour_number = h AND d.ba_code = 'ERCO' AND d.local_date = '2024-03-10'\nGROUP BY h\nORDER BY h;",
    },
  },
  {
    id: "materialize-temp-rows", title: "Materialize temp rows", dataset: "retail", runs: "lab",
    purpose: "Save a query result in a temporary table for later statements: December 2011 invoices.",
    difference: "SQLite and PostgreSQL use CREATE TEMP TABLE … AS. SQL Server uses SELECT … INTO and names local temporary tables with #.",
    glance: { sqlite: "CREATE TEMP TABLE t AS SELECT …", postgres: "CREATE TEMP TABLE t AS SELECT …", sqlserver: "SELECT … INTO #t FROM …" },
    examples: {
      sqlite: "CREATE TEMP TABLE recent_orders AS\nSELECT order_id, customer_id, ordered_at\nFROM orders\nWHERE ordered_at >= '2011-12-01';\nSELECT COUNT(*) AS recent_orders\nFROM recent_orders;",
      postgres: "CREATE TEMP TABLE recent_orders AS\nSELECT order_id, customer_id, ordered_at\nFROM orders\nWHERE ordered_at >= '2011-12-01';\nSELECT COUNT(*) AS recent_orders\nFROM recent_orders;",
      sqlserver: "SELECT order_id, customer_id, ordered_at\nINTO #recent_orders\nFROM orders\nWHERE ordered_at >= '2011-12-01';\nSELECT COUNT(*) AS recent_orders\nFROM #recent_orders;",
    },
  },
  {
    id: "incremental-update", title: "Upsert (incremental update)", dataset: "retail", runs: "lab",
    purpose: "Insert new keys and update existing ones in one statement: apply a product price feed.",
    difference: "SQLite and PostgreSQL add ON CONFLICT (key) DO UPDATE to an INSERT and read the proposed row as excluded. SQL Server uses MERGE with WHEN MATCHED and WHEN NOT MATCHED branches. All three need a unique key to detect the existing row.",
    glance: { sqlite: "INSERT … ON CONFLICT (key) DO UPDATE", postgres: "INSERT … ON CONFLICT (key) DO UPDATE", sqlserver: "MERGE … WHEN MATCHED / WHEN NOT MATCHED" },
    examples: {
      sqlite: "INSERT INTO products (stock_code, description, list_price, first_sold_at, is_merchandise)\nVALUES ('85123A', 'WHITE HANGING HEART T-LIGHT HOLDER', 2.75, '2009-12-01', 1),\n       ('NEW-001', 'New product', 4.50, '2011-12-10', 1)\nON CONFLICT (stock_code) DO UPDATE\nSET list_price = excluded.list_price;\nSELECT stock_code, description, list_price\nFROM products\nWHERE stock_code IN ('85123A', 'NEW-001');",
      postgres: "INSERT INTO products (stock_code, description, list_price, first_sold_at, is_merchandise)\nVALUES ('85123A', 'WHITE HANGING HEART T-LIGHT HOLDER', 2.75, '2009-12-01', 1),\n       ('NEW-001', 'New product', 4.50, '2011-12-10', 1)\nON CONFLICT (stock_code) DO UPDATE\nSET list_price = EXCLUDED.list_price;",
      sqlserver: "MERGE products AS t\nUSING (VALUES ('85123A', 'WHITE HANGING HEART T-LIGHT HOLDER', 2.75, '2009-12-01', 1),\n              ('NEW-001', 'New product', 4.50, '2011-12-10', 1))\n  AS s (stock_code, description, list_price, first_sold_at, is_merchandise)\n  ON t.stock_code = s.stock_code\nWHEN MATCHED THEN\n  UPDATE SET list_price = s.list_price\nWHEN NOT MATCHED THEN\n  INSERT (stock_code, description, list_price, first_sold_at, is_merchandise)\n  VALUES (s.stock_code, s.description, s.list_price, s.first_sold_at, s.is_merchandise);",
    },
  },
  {
    id: "return-changed-rows", title: "Return changed rows", dataset: "payments", runs: "lab",
    purpose: "Get back the rows a write changed without a second query: the accounts just closed.",
    difference: "SQLite (3.35+) and PostgreSQL add RETURNING to INSERT, UPDATE and DELETE. SQL Server uses an OUTPUT clause placed before WHERE, reading inserted.* and deleted.*.",
    glance: { sqlite: "UPDATE … RETURNING …", postgres: "UPDATE … RETURNING …", sqlserver: "UPDATE … OUTPUT inserted.… WHERE …" },
    examples: {
      sqlite: "UPDATE accounts\nSET closed_at = '2025-06-30'\nWHERE account_id IN (1264, 1753)\nRETURNING account_id, account_type, closed_at;",
      postgres: "UPDATE accounts\nSET closed_at = '2025-06-30'\nWHERE account_id IN (1264, 1753)\nRETURNING account_id, account_type, closed_at;",
      sqlserver: "UPDATE accounts\nSET closed_at = '2025-06-30'\nOUTPUT inserted.account_id, inserted.account_type, inserted.closed_at\nWHERE account_id IN (1264, 1753);",
    },
  },
  {
    id: "auto-numbered-ids", title: "Auto-numbered ids", dataset: "logistics", runs: "lab",
    purpose: "Let the database assign the id of a new row: add a carrier without choosing its carrier_id.",
    difference: "In SQLite an INTEGER PRIMARY KEY column is filled automatically (AUTOINCREMENT additionally stops ids being reused). SQL Server uses IDENTITY(seed, step) and SCOPE_IDENTITY(). PostgreSQL uses GENERATED … AS IDENTITY and RETURNING.",
    glance: { sqlite: "carrier_id INTEGER PRIMARY KEY", postgres: "carrier_id integer GENERATED ALWAYS AS IDENTITY", sqlserver: "carrier_id INT IDENTITY(1,1)" },
    examples: {
      sqlite: "INSERT INTO carriers (carrier_name, carrier_type, on_time_target_pct)\nVALUES ('Ridgeway Linehaul', 'regional', 94);\nSELECT carrier_id, carrier_name\nFROM carriers\nORDER BY carrier_id DESC\nLIMIT 3;",
      postgres: "CREATE TABLE carriers (\n  carrier_id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  carrier_name text NOT NULL,\n  carrier_type text NOT NULL,\n  on_time_target_pct integer\n);\nINSERT INTO carriers (carrier_name, carrier_type, on_time_target_pct)\nVALUES ('Ridgeway Linehaul', 'regional', 94)\nRETURNING carrier_id;",
      sqlserver: "CREATE TABLE carriers (\n  carrier_id INT IDENTITY(1,1) PRIMARY KEY,\n  carrier_name nvarchar(100) NOT NULL,\n  carrier_type nvarchar(20) NOT NULL,\n  on_time_target_pct int\n);\nINSERT INTO carriers (carrier_name, carrier_type, on_time_target_pct)\nVALUES ('Ridgeway Linehaul', 'regional', 94);\nSELECT SCOPE_IDENTITY() AS carrier_id;",
    },
  },
  {
    id: "stored-procedure", title: "Stored procedures", dataset: "payments",
    purpose: "Store server-side logic that can be invoked by name: close an account.",
    difference: "SQLite has no CREATE PROCEDURE; logic lives in the application, or in views and triggers. SQL Server invokes procedures with EXEC; PostgreSQL uses CALL. Reference only: nothing here runs.",
    glance: { sqlite: "Not supported", postgres: "CREATE PROCEDURE … / CALL", sqlserver: "CREATE PROCEDURE … / EXEC" },
    examples: {
      sqlite: "-- SQLite has no stored procedures.\n-- Run the statement from the application instead:\nUPDATE accounts\nSET closed_at = date('now')\nWHERE account_id = 1264;",
      postgres: "CREATE PROCEDURE close_account(p_account_id integer)\nLANGUAGE sql\nAS $$\n  UPDATE accounts\n  SET closed_at = CURRENT_DATE\n  WHERE account_id = p_account_id;\n$$;\nCALL close_account(1264);",
      sqlserver: "CREATE PROCEDURE close_account @account_id INT\nAS\nBEGIN\n  UPDATE accounts\n  SET closed_at = CAST(GETDATE() AS date)\n  WHERE account_id = @account_id;\nEND;\nEXEC close_account @account_id = 1264;",
    },
  },
  {
    id: "partitioning", title: "Partitioning", dataset: "energy",
    purpose: "Split a large table into partitions by a key such as time: hourly demand by month.",
    difference: "SQL Server defines a partition function and scheme. PostgreSQL declares a partitioned table and attaches partitions. SQLite has no native partitioning; an index on the time column is the usual substitute. Reference only.",
    glance: { sqlite: "Not supported · index the time column", postgres: "PARTITION BY RANGE (…)", sqlserver: "Partition function + scheme" },
    examples: {
      sqlite: "-- SQLite has no table partitioning.\n-- An index on the time column serves range queries:\nCREATE INDEX idx_hourly_demand_time\n  ON hourly_demand (hour_ending_utc);",
      postgres: "CREATE TABLE hourly_demand (\n  ba_code text NOT NULL,\n  hour_ending_utc timestamptz NOT NULL,\n  demand_mw integer\n) PARTITION BY RANGE (hour_ending_utc);\nCREATE TABLE hourly_demand_2024_01\n  PARTITION OF hourly_demand\n  FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');",
      sqlserver: "CREATE PARTITION FUNCTION pf_month (datetime2)\n  AS RANGE RIGHT FOR VALUES ('2024-02-01', '2024-03-01');\nCREATE PARTITION SCHEME ps_month\n  AS PARTITION pf_month ALL TO ([PRIMARY]);\nCREATE TABLE hourly_demand (\n  ba_code char(4) NOT NULL,\n  hour_ending_utc datetime2 NOT NULL,\n  demand_mw int\n) ON ps_month (hour_ending_utc);",
    },
  },
  {
    id: "csv-ingestion", title: "CSV ingestion", dataset: "flights",
    purpose: "Load a file of rows into a table: a monthly flights extract.",
    difference: "Runtime's datasets are preloaded, so nothing here imports files. The sqlite3 command-line shell has .import (a shell command, not SQL). SQL Server BULK INSERT and PostgreSQL COPY read files on the server; psql's \\copy reads from the client. Reference only.",
    glance: { sqlite: ".import (sqlite3 shell)", postgres: "COPY … FROM … WITH (FORMAT csv)", sqlserver: "BULK INSERT … WITH (FORMAT = 'CSV')" },
    examples: {
      sqlite: "-- sqlite3 command-line shell, not SQL:\n.import --csv --skip 1 flights_2025_04.csv flights",
      postgres: "COPY flights\nFROM '/data/flights_2025_04.csv'\nWITH (FORMAT csv, HEADER true);",
      sqlserver: "BULK INSERT flights\nFROM 'C:\\data\\flights_2025_04.csv'\nWITH (FORMAT = 'CSV', FIRSTROW = 2);",
    },
  },
];
