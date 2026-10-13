import { BRAND_NAME } from "@/platform/brand";

/** List badges only — body copy remains the source of truth for engine support. */
export const REFERENCE_ONLY_CONCEPTS = new Set([
  "Stored procedure",
  "Partitioning",
  "CSV ingestion",
]);

/** Presentation examples for every concept in the dialect guide, in the same order. */
export const syntaxNotes: Record<string, {
  purpose: string;
  difference: string;
  examples?: [string, string, string]; // SQLite, SQL Server, PostgreSQL
  sqlite?: "playground" | "lab";
}> = {
  "Limit output": {
    purpose: "Return a small, predictable set of rows.",
    difference: "SQLite and PostgreSQL put LIMIT after ORDER BY. SQL Server puts TOP after SELECT. Ordering by a unique key makes the chosen rows predictable.",
    examples: ["SELECT id, name\nFROM customers\nORDER BY id\nLIMIT 5;", "SELECT TOP (5) id, name\nFROM customers\nORDER BY id;", "SELECT id, name\nFROM customers\nORDER BY id\nLIMIT 5;"], sqlite: "playground",
  },
  "Monthly bucket": {
    purpose: "Group dates into calendar months for reporting.",
    difference: "SQLite returns a formatted text label. PostgreSQL and SQL Server truncate to the start of the month and return a date/time value. DATETRUNC requires SQL Server 2022 or later.",
    examples: ["SELECT strftime('%Y-%m', '2025-03-17')\n  AS month;", "SELECT DATETRUNC(month,\n  CAST('2025-03-17' AS date)) AS month;", "SELECT DATE_TRUNC('month',\n  TIMESTAMP '2025-03-17') AS month;"], sqlite: "playground",
  },
  "Add seven days": {
    purpose: "Find the date one week after a starting date.",
    difference: "SQLite uses a text modifier, SQL Server uses DATEADD, and PostgreSQL adds an interval. The returned types differ; SQLite date() returns text.",
    examples: ["SELECT date('2025-03-17', '+7 days')\n  AS next_week;", "SELECT DATEADD(day, 7,\n  CAST('2025-03-17' AS date)) AS next_week;", "SELECT DATE '2025-03-17'\n  + INTERVAL '7 days' AS next_week;"], sqlite: "playground",
  },
  "String length": {
    purpose: "Count characters and notice how trailing spaces affect the result.",
    difference: "SQLite length() and PostgreSQL LENGTH() count the trailing space in this text. SQL Server LEN() ignores trailing spaces, so this example returns 3 instead of 4.",
    examples: ["SELECT length('SQL ') AS characters;", "SELECT LEN('SQL ') AS characters;", "SELECT LENGTH('SQL ') AS characters;"], sqlite: "playground",
  },
  "Replace NULL": {
    purpose: "Choose a fallback when a value is missing.",
    difference: "COALESCE is available in all three engines and returns the first non-NULL expression. SQL Server also offers ISNULL with two arguments and different type-resolution rules.",
    examples: ["SELECT COALESCE(NULL, 'Unknown') AS city;", "SELECT COALESCE(CAST(NULL AS varchar(20)),\n  'Unknown') AS city;", "SELECT COALESCE(NULL::text, 'Unknown')\n  AS city;"], sqlite: "playground",
  },
  "Materialize temp rows": {
    purpose: "Save a query result in a temporary table for later statements.",
    difference: "SQLite and PostgreSQL use CREATE TEMP TABLE … AS. SQL Server uses SELECT … INTO and names local temporary tables with #. Run the SQLite script in Database Lab; each run starts fresh.",
    examples: ["CREATE TEMP TABLE customer_sample AS\nSELECT id, name FROM customers;\nSELECT * FROM customer_sample;", "SELECT id, name INTO #customer_sample\nFROM customers;\nSELECT * FROM #customer_sample;", "CREATE TEMP TABLE customer_sample AS\nSELECT id, name FROM customers;\nSELECT * FROM customer_sample;"], sqlite: "lab",
  },
  "Stored procedure": {
    purpose: "Store server-side logic that can be invoked by name.",
    difference: `SQLite has no CREATE PROCEDURE. SQL Server invokes procedures with EXEC; PostgreSQL uses CALL. These are capability references, not runnable scripts in ${BRAND_NAME}.`,
  },
  "Partitioning": {
    purpose: "Organize a large table into partitions using a key such as a date.",
    difference: "SQL Server defines partition functions and schemes. PostgreSQL declares a partitioned table and its partitions. SQLite does not offer equivalent native table partitioning; these entries are references only.",
  },
  "Safe YYYYMMDD conversion": {
    purpose: "Reject malformed or impossible calendar dates before using them.",
    difference: "SQL Server TRY_CONVERT with style 112 returns NULL on a failed conversion. SQLite and PostgreSQL need explicit validation; do not assume a parser rejects every invalid date. These entries describe validation approaches rather than complete scripts.",
  },
  "Incremental update": {
    purpose: "Insert new keys and update existing keys without duplicating records.",
    difference: "SQLite and PostgreSQL add ON CONFLICT (key) DO UPDATE to an INSERT, and read the proposed row as excluded. SQL Server uses MERGE with WHEN MATCHED and WHEN NOT MATCHED branches. All three need a unique key to detect the existing row; production loads also need transaction and concurrency handling.",
    examples: [
      "CREATE TEMP TABLE stock(sku TEXT PRIMARY KEY, qty INTEGER);\nINSERT INTO stock VALUES ('A1', 5);\nINSERT INTO stock VALUES ('A1', 3)\n  ON CONFLICT(sku) DO UPDATE\n  SET qty = qty + excluded.qty;\nSELECT sku, qty FROM stock;",
      "MERGE stock AS t\nUSING (VALUES ('A1', 3)) AS s(sku, qty)\n  ON t.sku = s.sku\nWHEN MATCHED THEN\n  UPDATE SET qty = t.qty + s.qty\nWHEN NOT MATCHED THEN\n  INSERT (sku, qty) VALUES (s.sku, s.qty);",
      "INSERT INTO stock (sku, qty) VALUES ('A1', 3)\n  ON CONFLICT (sku) DO UPDATE\n  SET qty = stock.qty + EXCLUDED.qty;",
    ],
    sqlite: "lab",
  },
  "CSV ingestion": {
    purpose: "Load file data into database tables.",
    difference: `${BRAND_NAME} uses preloaded sample tables and does not import CSV files. SQL Server BULK INSERT and PostgreSQL COPY require file access and configuration outside this app. These are reference capabilities only.`,
  },
  "Concatenate text": {
    purpose: "Join pieces of text into one value, such as a first and last name.",
    difference: "SQLite and PostgreSQL use ||. SQL Server uses + between strings. In all three, joining a NULL with the operator returns NULL. CONCAT() treats NULL as an empty string in SQL Server and PostgreSQL, and SQLite 3.44+ also has concat().",
    examples: ["SELECT 'Ada' || ' ' || 'Lovelace' AS full_name,\n  concat('Ada', NULL, '!') AS skips_null;", "SELECT 'Ada' + ' ' + 'Lovelace' AS full_name,\n  CONCAT('Ada', NULL, '!') AS skips_null;", "SELECT 'Ada' || ' ' || 'Lovelace' AS full_name,\n  CONCAT('Ada', NULL, '!') AS skips_null;"], sqlite: "playground",
  },
  "Today's date": {
    purpose: "Get the current date, for example to compare against due dates.",
    difference: "SQLite date('now') returns today's date as text in UTC. SQL Server GETDATE() returns the server's local date and time, so it is cast to date. PostgreSQL CURRENT_DATE uses the session time zone and stays fixed for the whole transaction.",
    examples: ["SELECT date('now') AS today;", "SELECT CAST(GETDATE() AS date) AS today;", "SELECT CURRENT_DATE AS today;"], sqlite: "playground",
  },
  "Days between dates": {
    purpose: "Count how many days separate two dates.",
    difference: "SQLite subtracts Julian day numbers, which returns a real number (fractional when times are included). SQL Server DATEDIFF counts day boundaries crossed. PostgreSQL subtracts one date from another and returns an integer.",
    examples: ["SELECT julianday('2025-03-17')\n  - julianday('2025-03-10') AS days;", "SELECT DATEDIFF(day, '2025-03-10',\n  '2025-03-17') AS days;", "SELECT DATE '2025-03-17'\n  - DATE '2025-03-10' AS days;"], sqlite: "playground",
  },
  "Case-insensitive match": {
    purpose: "Find text regardless of upper or lower case.",
    difference: "SQLite LIKE ignores case for ASCII letters by default. SQL Server LIKE follows the column's collation; most default installations are case-insensitive. PostgreSQL LIKE is case-sensitive, so it adds ILIKE.",
    examples: ["SELECT name\nFROM customers\nWHERE name LIKE 'al%';", "SELECT name\nFROM customers\nWHERE name LIKE 'al%';", "SELECT name\nFROM customers\nWHERE name ILIKE 'al%';"], sqlite: "playground",
  },
  "Combine values per group": {
    purpose: "Turn the rows in each group into one comma-separated list.",
    difference: "SQLite uses group_concat, with ORDER BY inside the call from 3.44. SQL Server STRING_AGG (2017+) orders with WITHIN GROUP. PostgreSQL string_agg takes ORDER BY inside the call. Without an order, the list order is not guaranteed.",
    examples: ["SELECT city,\n  group_concat(name, ', ' ORDER BY name) AS customers\nFROM customers\nWHERE city IS NOT NULL\nGROUP BY city;", "SELECT city,\n  STRING_AGG(name, ', ')\n    WITHIN GROUP (ORDER BY name) AS customers\nFROM customers\nWHERE city IS NOT NULL\nGROUP BY city;", "SELECT city,\n  string_agg(name, ', ' ORDER BY name) AS customers\nFROM customers\nWHERE city IS NOT NULL\nGROUP BY city;"], sqlite: "playground",
  },
  "Find text position": {
    purpose: "Find where one piece of text first appears inside another.",
    difference: "All three count from 1 and return 0 when nothing is found, but the argument order differs: SQLite instr(text, search), SQL Server CHARINDEX(search, text), and PostgreSQL POSITION(search IN text).",
    examples: ["SELECT instr('data-engineer', '-') AS position;", "SELECT CHARINDEX('-', 'data-engineer') AS position;", "SELECT POSITION('-' IN 'data-engineer') AS position;"], sqlite: "playground",
  },
  "Page through results": {
    purpose: "Show results one page at a time, for example rows 4 to 6.",
    difference: "SQLite and PostgreSQL use LIMIT with OFFSET. SQL Server (2012+) uses OFFSET … ROWS FETCH NEXT … ROWS ONLY, which requires ORDER BY. Order by a unique key so pages stay stable.",
    examples: ["SELECT id, name\nFROM customers\nORDER BY id\nLIMIT 3 OFFSET 3;", "SELECT id, name\nFROM customers\nORDER BY id\nOFFSET 3 ROWS FETCH NEXT 3 ROWS ONLY;", "SELECT id, name\nFROM customers\nORDER BY id\nLIMIT 3 OFFSET 3;"], sqlite: "playground",
  },
  "Number series": {
    purpose: "Generate a sequence of numbers with a recursive common table expression.",
    difference: "SQLite and PostgreSQL write WITH RECURSIVE. SQL Server omits the RECURSIVE keyword and stops after 100 levels unless OPTION (MAXRECURSION n) raises the limit. PostgreSQL can also use generate_series(1, 5).",
    examples: ["WITH RECURSIVE n(x) AS (\n  SELECT 1\n  UNION ALL\n  SELECT x + 1 FROM n WHERE x < 5\n)\nSELECT x FROM n;", "WITH n(x) AS (\n  SELECT 1\n  UNION ALL\n  SELECT x + 1 FROM n WHERE x < 5\n)\nSELECT x FROM n;", "WITH RECURSIVE n(x) AS (\n  SELECT 1\n  UNION ALL\n  SELECT x + 1 FROM n WHERE x < 5\n)\nSELECT x FROM n;"], sqlite: "playground",
  },
  "Auto-numbered ids": {
    purpose: "Let the database assign a new id to each inserted row.",
    difference: "In SQLite, an INTEGER PRIMARY KEY column is filled automatically; AUTOINCREMENT additionally stops ids from being reused. SQL Server uses IDENTITY(seed, step). PostgreSQL uses GENERATED … AS IDENTITY (serial is the older form).",
    examples: ["CREATE TEMP TABLE tickets(\n  id INTEGER PRIMARY KEY,\n  title TEXT\n);\nINSERT INTO tickets(title) VALUES ('First'), ('Second');\nSELECT id, title FROM tickets;", "CREATE TABLE tickets (\n  id INT IDENTITY(1,1) PRIMARY KEY,\n  title nvarchar(100)\n);\nINSERT INTO tickets (title) VALUES ('First'), ('Second');", "CREATE TABLE tickets (\n  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n  title text\n);\nINSERT INTO tickets (title) VALUES ('First'), ('Second');"], sqlite: "lab",
  },
};
