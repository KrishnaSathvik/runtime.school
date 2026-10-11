/** Presentation examples; the canonical eleven-concept reference remains intact. */
export const syntaxNotes: Record<string, {
  purpose: string;
  difference: string;
  examples?: [string, string, string]; // SQLite, SQL Server, PostgreSQL
  sqlite?: "playground" | "lab";
}> = {
  "Limit output": {
    purpose: "Return a small, predictable set of rows.",
    difference: "SQLite and PostgreSQL put LIMIT after ORDER BY. SQL Server puts TOP after SELECT. Ordering by a unique key makes the chosen rows predictable.",
    examples: ["SELECT id, name\nFROM customers\nORDER BY id\nLIMIT 10;", "SELECT TOP (10) id, name\nFROM customers\nORDER BY id;", "SELECT id, name\nFROM customers\nORDER BY id\nLIMIT 10;"], sqlite: "playground",
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
    difference: "SQLite has no CREATE PROCEDURE. SQL Server invokes procedures with EXEC; PostgreSQL uses CALL. These are capability references, not runnable scripts in SQL Studio.",
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
    difference: "SQLite and PostgreSQL support ON CONFLICT against a unique key. SQL Server requires an engine-specific strategy with appropriate transactions and concurrency handling. These reference fragments need a target schema and update rules.",
  },
  "CSV ingestion": {
    purpose: "Load file data into database tables.",
    difference: "SQL Studio uses preloaded sample tables and does not import CSV files. SQL Server BULK INSERT and PostgreSQL COPY require file access and configuration outside this app. These are reference capabilities only.",
  },
};
