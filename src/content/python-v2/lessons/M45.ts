/**
 * M45 Data Formats & Analytical Workflows: five lessons (PY-L45-01 … PY-L45-05).
 *
 * Parquet with pyarrow (typed columns that survive a round trip, reading only some columns), chunked CSV reading
 * (combining partial sums and counts), SQL from Python (sqlite3 with ? parameters through pandas, and DuckDB querying
 * DataFrames and files), reproducible analysis (seeded random generators, explicit parameters, sorted output and a
 * fingerprint hash), and exports that read back exactly (to_csv, to_json). The data is real NYC yellow taxi trips
 * (D06, January 2025) and their pickup zones. Every library here runs in the course's browser Python: pandas,
 * pyarrow and duckdb are loaded per lesson.
 *
 * Challenges are graded by calling the learner's function on files the check writes (CSV text, or Parquet written
 * by pandas in the check's setup), on in-memory SQLite connections, and by reading back the files the function wrote.
 * Version 2: rewritten; saved progress from version 1 does not count as mastery.
 */
import type { PyPackage } from "@/engine/python/client";
import type { PyLesson } from "../model";
import { example, fn, hiddenCase, raisesCase, usesSource } from "../checks";
import { csvRows, frameRows, pv } from "../fn-checks";
import { frameSetup } from "./M43";

const src = (s: TemplateStringsArray, ...v: unknown[]) => String.raw(s, ...v).replace(/^\n/, "");

export const PARQ = ["pandas", "pyarrow"] as const satisfies readonly PyPackage[];
export const PDONLY = ["pandas"] as const satisfies readonly PyPackage[];
export const DUCK = ["pandas", "duckdb"] as const satisfies readonly PyPackage[];
const loose = { numbers: "int-float-equal" } as const;

/** Fourteen real NYC yellow taxi trips, 15 January 2025 (D06), as a CSV file the exercises read. */
export const TRIPS_CSV = `trip_id,pickup_at,trip_distance_miles,pickup_zone_id,payment_type_id,fare_amount,tip_amount,total_amount
16126,2025-01-15 00:12:47,9.2,186,1,40.8,10.7,64.19
16127,2025-01-15 00:18:28,0.9,264,1,7.2,2.55,15.5
16128,2025-01-15 00:25:55,3.17,39,0,17.2,0,18.7
16129,2025-01-15 00:27:23,4.86,100,0,22.06,0,26.81
16130,2025-01-15 00:29:47,0.5,263,1,5.1,1,11.1
16131,2025-01-15 00:33:18,2.81,164,1,16.3,4.41,26.46
16132,2025-01-15 00:39:15,10.43,70,1,42.9,11.12,66.71
16133,2025-01-15 00:43:02,5.2,114,1,22.6,5.65,34
16134,2025-01-15 00:43:51,1.1,48,1,7.9,3.4,17.05
16135,2025-01-15 00:48:50,1.48,112,0,8.33,0,9.83
16136,2025-01-15 00:52:19,7.5,114,1,35.9,8.33,49.98
16137,2025-01-15 01:06:21,3.58,249,1,18.4,6.04,30.19
16138,2025-01-15 01:20:55,2.85,107,1,15.6,4.27,25.62
16139,2025-01-15 01:29:27,6.6,231,1,27.5,9.97,43.22
`;

export const tripRecords = TRIPS_CSV.trim().split("\n").slice(1).map((line) => {
  const [trip_id, pickup_at, trip_distance_miles, pickup_zone_id, payment_type_id, fare_amount, tip_amount, total_amount] = line.split(",");
  return { trip_id: Number(trip_id), pickup_at, trip_distance_miles: Number(trip_distance_miles), pickup_zone_id: Number(pickup_zone_id), payment_type_id: Number(payment_type_id), fare_amount: Number(fare_amount), tip_amount: Number(tip_amount), total_amount: Number(total_amount) };
});

export const zoneRecords = [
  { zone_id: 39, zone_name: "Canarsie", borough: "Brooklyn" },
  { zone_id: 48, zone_name: "Clinton East", borough: "Manhattan" },
  { zone_id: 70, zone_name: "East Elmhurst", borough: "Queens" },
  { zone_id: 100, zone_name: "Garment District", borough: "Manhattan" },
  { zone_id: 107, zone_name: "Gramercy", borough: "Manhattan" },
  { zone_id: 112, zone_name: "Greenpoint", borough: "Brooklyn" },
  { zone_id: 114, zone_name: "Greenwich Village South", borough: "Manhattan" },
  { zone_id: 164, zone_name: "Midtown South", borough: "Manhattan" },
  { zone_id: 186, zone_name: "Penn Station/Madison Sq West", borough: "Manhattan" },
  { zone_id: 231, zone_name: "TriBeCa/Civic Center", borough: "Manhattan" },
  { zone_id: 249, zone_name: "West Village", borough: "Manhattan" },
  { zone_id: 263, zone_name: "Yorkville West", borough: "Manhattan" },
  { zone_id: 264, zone_name: "N/A", borough: "Unknown" },
];

/** Setup that writes `rows` to a Parquet file for a check. */
const parquetSetup = (rows: Record<string, unknown>[], path: string) => `${frameSetup(rows)}\n_df.to_parquet(${JSON.stringify(path)}, index=False)`;

export const m45Lessons: PyLesson[] = [
  // ------------------------------------------------------------------ PY-L45-01 Parquet and Arrow
  {
    id: "PY-L45-01",
    version: 2,
    slug: "parquet-files",
    title: "Parquet files",
    lede: "CSV stores text, so every reader guesses the types again. Parquet stores typed columns: timestamps stay timestamps, codes stay text, and a reader can load only the columns it needs.",
    focus: "Write and read Parquet with pandas and pyarrow, explain what it keeps that CSV loses, and read only the needed columns.",
    minutes: 18,
    objectives: [
      "Round-trip a DataFrame through CSV and through Parquet and compare the dtypes that come back",
      "Read only some columns with `read_parquet(path, columns=[...])`",
      "Inspect a Parquet file's schema and row count with `pyarrow.parquet.ParquetFile`",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "boolean", "conversion", "dict-comp", "dict-get", "dict-literal", "dict-lookup", "field-ann", "for-loop", "function-def", "function-param", "function-return", "import-alias", "import-module", "len-call", "list-index", "list-literal", "list-mutate", "membership", "np-array", "np-dtype", "np-reduce", "part-attr", "pd-frame", "pd-group", "pd-kind", "pd-time", "print-call", "print-several", "print-text", "reassignment", "string-index", "top-level-indent", "tuple-unpack", "zip-call"],
    teaches: ["arrow-file"],
    packages: PARQ,
    blocks: [
      {
        kind: "text",
        md: "A CSV file is text. When you read it back, `read_csv` guesses each column's type again: a timestamp comes back as text, and a zone code such as `007` comes back as the number 7. **Parquet** is a binary, column-oriented format: each column is stored with its type, compressed, and kept apart from the others. `df.to_parquet(path)` writes one and `pd.read_parquet(path)` reads it back with the same dtypes. pandas uses the **pyarrow** library (Apache Arrow) to do it, which is why this lesson loads pyarrow.\n\nBecause columns are stored separately, `read_parquet(path, columns=[...])` reads only those columns from disk, which matters when a file has fifty columns and millions of rows.",
      },
      {
        kind: "example",
        title: "What survives a round trip",
        code: src`
import pandas as pd

trips = pd.DataFrame({
    "trip_id": [16126, 16127, 16130],
    "pickup_at": pd.to_datetime(["2025-01-15 00:12:47", "2025-01-15 00:18:28", "2025-01-15 00:29:47"]),
    "pickup_zone": ["186", "264", "007"],
    "fare_amount": [40.8, 7.2, 5.1],
})
trips.to_csv("trips.csv", index=False)
trips.to_parquet("trips.parquet", index=False)
from_csv = pd.read_csv("trips.csv")
from_parquet = pd.read_parquet("trips.parquet")
print(from_csv.dtypes.astype(str).tolist(), from_csv["pickup_zone"].tolist())
print(from_parquet.dtypes.astype(str).tolist(), from_parquet["pickup_zone"].tolist())
print(from_parquet.equals(trips))
`,
        output: "['int64', 'str', 'int64', 'float64'] [186, 264, 7]\n['int64', 'datetime64[us]', 'str', 'float64'] ['186', '264', '007']\nTrue\n",
        note: "From CSV the timestamp is text and `007` became 7. From Parquet every column has the type it was written with, and `equals` confirms the whole table is identical.",
      },
      {
        kind: "error-example",
        title: "Reading a CSV as if it were Parquet",
        code: src`
import pandas as pd

pd.DataFrame({"trip_id": [16126]}).to_csv("trips.csv", index=False)
pd.read_parquet("trips.csv")
`,
        error: "ArrowInvalid",
        output: "",
        note: "`ArrowInvalid: ... Parquet magic bytes not found`. A Parquet file starts and ends with the bytes `PAR1`; a file name ending is not enough.",
      },
      {
        kind: "example",
        title: "Look inside a file, then read two columns",
        code: src`
import pandas as pd
import pyarrow.parquet as pq

trips = pd.DataFrame({
    "trip_id": [16126, 16127, 16128, 16129],
    "pickup_zone_id": [186, 264, 39, 100],
    "payment_type_id": [1, 1, 0, 0],
    "fare_amount": [40.8, 7.2, 17.2, 22.06],
    "tip_amount": [10.7, 2.55, 0.0, 0.0],
})
trips.to_parquet("trips.parquet", index=False)
info = pq.ParquetFile("trips.parquet")
print(info.metadata.num_rows, info.schema_arrow.names)
fares = pd.read_parquet("trips.parquet", columns=["payment_type_id", "fare_amount"])
print(fares.shape, fares.groupby("payment_type_id")["fare_amount"].sum().to_dict())
`,
        output: "4 ['trip_id', 'pickup_zone_id', 'payment_type_id', 'fare_amount', 'tip_amount']\n(4, 2) {0: 39.26, 1: 48.0}\n",
        note: "The file describes itself: row count and column names come from its metadata without loading the data. `columns=` loads just the two columns the question needs.",
      },
      {
        kind: "text",
        md: "**When to use it:** data you will read again, by programs (pipelines, analysis, caches between steps), especially wide or large tables. Keep CSV for exchanging small files with people and spreadsheets. **Mistakes to avoid:** treating `.parquet` as text (it is binary); reading every column when you need two; and writing the index you don't want (`index=False`).",
      },
    ],
    tryIt: {
      id: "try",
      title: "Keep the types when saving",
      prompt: "`save_and_reload` saves a table and reads it back, but it uses CSV, so the zone codes lose their leading zeros. Use Parquet instead (the file name is up to you).",
      spec: [
        ["Function", "`save_and_reload(table)`"],
        ["Returns", "the table read back from the file"],
      ],
      starter: src`
import pandas as pd

def save_and_reload(table):
    table.to_csv("saved.csv", index=False)
    return pd.read_csv("saved.csv")

back = save_and_reload(pd.DataFrame({"pickup_zone": ["007", "186"], "fare_amount": [5.1, 40.8]}))
print(back["pickup_zone"].tolist())
`,
      answer: src`
import pandas as pd

def save_and_reload(table):
    table.to_parquet("saved.parquet", index=False)
    return pd.read_parquet("saved.parquet")

back = save_and_reload(pd.DataFrame({"pickup_zone": ["007", "186"], "fare_amount": [5.1, 40.8]}))
print(back["pickup_zone"].tolist())
`,
      wrong: [
        {
          code: src`
import pandas as pd

def save_and_reload(table):
    table.to_csv("saved.csv", index=False)
    return pd.read_csv("saved.csv", dtype=str)
`,
          fails: ["types"],
          why: "the codes survive, but every other column now comes back as text",
        },
      ],
      hints: ["Two lines change: the writer and the reader.", "pandas has a `to_parquet` and a `read_parquet`.", "Keep `index=False` when writing."],
      task: {
        packages: PARQ,
        checks: [
          { kind: "expr", id: "types", label: "save_and_reload() returns the same values and dtypes", expr: "import pandas as _pd\n_t = _pd.DataFrame({'pickup_zone': ['007', '186'], 'fare_amount': [5.1, 40.8], 'pickup_at': _pd.to_datetime(['2025-01-15 00:29:47', '2025-01-15 00:12:47'])})\n_b = save_and_reload(_t)\nresult = [_b['pickup_zone'].tolist(), _b.dtypes.astype(str).tolist()]", expected: pv([["007", "186"], ["str", "float64", "datetime64[us]"]]) },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Average fare by payment type from a Parquet file",
        prompt: "Write `fare_by_payment(path)`: read **only** the `payment_type_id` and `fare_amount` columns of the Parquet file at `path`, and return the average fare per payment type as a dictionary.",
        spec: [
          ["Function", "`fare_by_payment(path)`"],
          ["Returns", "`{payment_type_id: average fare}`"],
          ["Example", "the 14 trips → `{0: 15.863…, 1: 21.836…}` (cash/flex trips 0, card trips 1)"],
        ],
        starter: src`
import pandas as pd

def fare_by_payment(path):
    return {}

pd.DataFrame({"payment_type_id": [1, 1, 0], "fare_amount": [40.8, 7.2, 17.2], "tip_amount": [10.7, 2.55, 0.0]}).to_parquet("trips.parquet", index=False)
print(fare_by_payment("trips.parquet"))
`,
        answer: src`
import pandas as pd

def fare_by_payment(path):
    fares = pd.read_parquet(path, columns=["payment_type_id", "fare_amount"])
    return fares.groupby("payment_type_id")["fare_amount"].mean().to_dict()

pd.DataFrame({"payment_type_id": [1, 1, 0], "fare_amount": [40.8, 7.2, 17.2], "tip_amount": [10.7, 2.55, 0.0]}).to_parquet("trips.parquet", index=False)
print(fare_by_payment("trips.parquet"))
`,
        alternatives: [
          src`
import pandas as pd

def fare_by_payment(path):
    table = pd.read_parquet(path, columns=["fare_amount", "payment_type_id"])
    sums, counts = {}, {}
    for kind, fare in zip(table["payment_type_id"], table["fare_amount"]):
        sums[int(kind)] = sums.get(int(kind), 0) + fare
        counts[int(kind)] = counts.get(int(kind), 0) + 1
    return {k: sums[k] / counts[k] for k in sums}
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def fare_by_payment(path):
    fares = pd.read_parquet(path, columns=["payment_type_id", "fare_amount"])
    return fares.groupby("payment_type_id")["fare_amount"].sum().to_dict()
`,
            fails: ["returns", "returns-hidden"],
            why: "it totals the fares instead of averaging them",
          },
          {
            code: src`
import pandas as pd

def fare_by_payment(path):
    return pd.read_parquet(path).groupby("payment_type_id")["fare_amount"].mean().to_dict()
`,
            fails: ["columns"],
            why: "the values are right, but every column is read from disk",
          },
        ],
        hints: [
          "Ask `read_parquet` for just the two columns.",
          "Then it is a groupby and a mean.",
          "`to_dict()` turns the result into a plain dictionary.",
        ],
        task: {
          packages: PARQ,
          checks: [
            { kind: "expr", id: "returns", label: "fare_by_payment() averages fares per payment type", show: "fare_by_payment('trips.parquet')", expr: `${parquetSetup(tripRecords, "_trips.parquet")}\nresult = fare_by_payment("_trips.parquet")`, expected: { t: "dict", entries: [[{ t: "int", v: "0" }, { t: "float", v: 15.863333333333332 }], [{ t: "int", v: "1" }, { t: "float", v: 21.836363636363636 }]] }, compare: loose },
            { kind: "expr", id: "returns-hidden", label: "Works for other files (a single payment type, other payment codes)", hidden: true, expr: `${parquetSetup([{ trip_id: 1, payment_type_id: 2, fare_amount: 10, tip_amount: 0 }, { trip_id: 2, payment_type_id: 2, fare_amount: 20, tip_amount: 0 }, { trip_id: 3, payment_type_id: 4, fare_amount: 3, tip_amount: 0 }], "_other.parquet")}\nresult = fare_by_payment("_other.parquet")`, expected: { t: "dict", entries: [[{ t: "int", v: "2" }, { t: "float", v: 15 }], [{ t: "int", v: "4" }, { t: "float", v: 3 }]] }, compare: loose },
            { kind: "expr", id: "columns", label: "Only the two needed columns are read", expr: `import pandas as _pd\n_seen = []\n_orig = _pd.read_parquet\ndef _spy(path, *a, **k):\n    _seen.append(k.get("columns"))\n    return _orig(path, *a, **k)\n_pd.read_parquet = _spy\ntry:\n${parquetSetup(tripRecords, "_trips.parquet").split("\n").map((l) => "    " + l).join("\n")}\n    fare_by_payment("_trips.parquet")\nfinally:\n    _pd.read_parquet = _orig\nresult = bool(_seen) and all(c is not None and sorted(c) == ["fare_amount", "payment_type_id"] for c in _seen)`, expected: pv(true) },
          ],
        },
      },
      {
        id: "c2",
        title: "Convert a CSV export to typed Parquet",
        prompt: "Write `csv_to_parquet(csv_path, parquet_path)`: read the trips CSV keeping `pickup_zone_id` as **text** (zone codes are labels, not numbers) and parsing `pickup_at` as a datetime (`%Y-%m-%d %H:%M:%S`), write it to `parquet_path` without the index, and return the number of rows written.",
        spec: [
          ["Function", "`csv_to_parquet(csv_path, parquet_path)`"],
          ["Returns", "the number of rows"],
          ["Checked", "the Parquet file's dtypes and values, read back by the check"],
        ],
        starter: src`
import pandas as pd

def csv_to_parquet(csv_path, parquet_path):
    return 0

print(csv_to_parquet("trips.csv", "trips.parquet"))
`,
        answer: src`
import pandas as pd

def csv_to_parquet(csv_path, parquet_path):
    trips = pd.read_csv(csv_path, dtype={"pickup_zone_id": str})
    trips["pickup_at"] = pd.to_datetime(trips["pickup_at"], format="%Y-%m-%d %H:%M:%S")
    trips.to_parquet(parquet_path, index=False)
    return len(trips)

print(csv_to_parquet("trips.csv", "trips.parquet"))
`,
        alternatives: [
          src`
import pandas as pd

def csv_to_parquet(csv_path, parquet_path):
    trips = pd.read_csv(csv_path, dtype={"pickup_zone_id": "str"}, parse_dates=["pickup_at"], date_format="%Y-%m-%d %H:%M:%S")
    trips.to_parquet(parquet_path, index=False)
    return trips.shape[0]
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def csv_to_parquet(csv_path, parquet_path):
    trips = pd.read_csv(csv_path)
    trips.to_parquet(parquet_path, index=False)
    return len(trips)
`,
            fails: ["types", "types-hidden"],
            why: "the zone codes are stored as numbers and the timestamps as text",
          },
          {
            code: src`
import pandas as pd

def csv_to_parquet(csv_path, parquet_path):
    trips = pd.read_csv(csv_path, dtype={"pickup_zone_id": str})
    trips.to_parquet(parquet_path, index=False)
    return len(trips)
`,
            fails: ["types"],
            why: "the zone codes are kept, but the pickup times are stored as text",
          },
        ],
        hints: [
          "Tell `read_csv` which column must stay text.",
          "Convert the timestamp column before writing.",
          "Write without the index, and return how many rows there were.",
        ],
        task: {
          packages: PARQ,
          files: { "trips.csv": TRIPS_CSV, "zones_007.csv": "trip_id,pickup_at,trip_distance_miles,pickup_zone_id,payment_type_id,fare_amount,tip_amount,total_amount\n1,2025-01-31 23:59:59,1.0,007,1,5.0,0,5.0\n" },
          checks: [
            { kind: "expr", id: "types", label: "The Parquet file keeps zone codes as text and pickup times as datetimes", show: "csv_to_parquet('trips.csv', 'out.parquet')", expr: "import pandas as _pd\n_n = csv_to_parquet('trips.csv', '_out.parquet')\n_b = _pd.read_parquet('_out.parquet')\nresult = [int(_n), str(_b['pickup_zone_id'].dtype), str(_b['pickup_at'].dtype).startswith('datetime64'), _b['pickup_zone_id'].tolist()[:3]]", expected: pv([14, "str", true, ["186", "264", "39"]]) },
            { kind: "expr", id: "types-hidden", label: "Works for another file (a code with leading zeros, a time at the end of a month)", hidden: true, expr: "import pandas as _pd\n_n = csv_to_parquet('zones_007.csv', '_z.parquet')\n_b = _pd.read_parquet('_z.parquet')\nresult = [int(_n), _b['pickup_zone_id'].tolist(), str(_b['pickup_at'].iloc[0])]", expected: pv([1, ["007"], "2025-01-31 23:59:59"]) },
            { kind: "expr", id: "columns", label: "The file has exactly the CSV's columns (no index column)", expr: "import pyarrow.parquet as _pq\ncsv_to_parquet('trips.csv', '_c.parquet')\nresult = _pq.ParquetFile('_c.parquet').schema_arrow.names", expected: pv(["trip_id", "pickup_at", "trip_distance_miles", "pickup_zone_id", "payment_type_id", "fare_amount", "tip_amount", "total_amount"]) },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import pandas as pd

codes = pd.DataFrame({"zone": ["007", "186"], "at": pd.to_datetime(["2025-01-15", "2025-01-16"])})
codes.to_csv("c.csv", index=False)
codes.to_parquet("c.parquet", index=False)
print(pd.read_csv("c.csv")["zone"].tolist(), pd.read_parquet("c.parquet")["zone"].tolist())
`,
        choices: ["[7, 186] ['007', '186']", "['007', '186'] ['007', '186']", "[7, 186] [7, 186]", "['007', '186'] [7, 186]"],
        answer: 0,
        why: "CSV stores only text, and `read_csv` guesses the codes are numbers; Parquet stored the column as text and gives it back as text.",
      },
      {
        id: "q2",
        prompt: "A common mistake: expecting `columns=` to choose rows. What does this print?",
        program: src`
import pandas as pd

trips = pd.DataFrame({"payment_type_id": [1, 0, 1], "fare_amount": [40.8, 17.2, 7.2]})
trips.to_parquet("t.parquet", index=False)
part = pd.read_parquet("t.parquet", columns=["fare_amount"])
print(part.shape, "payment_type_id" in part.columns)
`,
        choices: ["(3, 1) False", "(2, 1) False", "(3, 2) True", "(1, 3) False"],
        answer: 0,
        why: "`columns=` picks which columns are read; every row still comes back. Filter rows afterwards (or with a query engine such as DuckDB, “SQL with SQLite and DuckDB”).",
      },
      {
        id: "q3",
        prompt: "When is CSV still the better choice?",
        choices: ["Sending a small table to a person who will open it in a spreadsheet", "Storing a 50-column table you will query by two columns", "Caching the output of a pipeline step", "Keeping timestamps and codes exactly typed"],
        answer: 0,
        why: "CSV is plain text that every tool opens. The other jobs are what Parquet's typed, column-wise storage is for.",
      },
    ],
    review: [
      "Parquet stores typed, compressed columns: dtypes survive a round trip; CSV makes every reader guess again.",
      "`read_parquet(path, columns=[...])` reads only what you need; `pyarrow.parquet.ParquetFile` shows the schema and row count.",
      "Write with `index=False` unless the index carries data.",
      "Next: files too big to read at once, processed in chunks.",
    ],
  },

  // ------------------------------------------------------------------ PY-L45-02 chunking
  {
    id: "PY-L45-02",
    version: 2,
    slug: "read-csv-in-chunks",
    title: "Reading a file in chunks",
    lede: "read_csv(chunksize=n) hands you a large file n rows at a time, so memory holds one chunk instead of the whole file. The answer is built by combining partial results, which works for sums and counts but not for averages of averages.",
    focus: "Process a CSV with read_csv(chunksize=..., usecols=...), combining partial sums and counts across chunks into exact totals and means.",
    minutes: 18,
    objectives: [
      "Iterate over `pd.read_csv(path, chunksize=n)` and read only the needed columns with `usecols`",
      "Combine per-chunk sums and counts into an exact overall result",
      "Explain why averaging the chunk averages gives the wrong mean",
    ],
    requires: ["aggregate-call", "arithmetic", "assignment", "comparison", "conversion", "dict-comp", "dict-get", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-doc", "function-param", "function-return", "import-alias", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "nested-loop", "newline-escape", "np-reduce", "pd-filter", "pd-frame", "pd-group", "pd-loc", "pd-merge", "precedence", "print-call", "print-several", "print-text", "string-index", "top-level-indent", "tuple-unpack", "unquoted-name"],
    teaches: ["pd-chunk"],
    packages: PDONLY,
    blocks: [
      {
        kind: "text",
        md: "The full taxi file has more than a hundred thousand trips; a year of trips has tens of millions, more than fits in memory. `pd.read_csv(path, chunksize=10_000)` doesn't read the file: it returns a reader that you loop over, getting a DataFrame of up to 10,000 rows each time. Like the generators of the Iterators & Generators module, it holds one piece at a time. `usecols=[...]` reads only the columns you name, which saves memory again.\n\nEvery chunk is an ordinary DataFrame, so you compute a **partial result** on it and combine those. Sums and counts combine by adding.",
      },
      {
        kind: "example",
        title: "Total fares, three rows at a time",
        code: src`
import io
import pandas as pd

csv_text = """trip_id,payment_type_id,fare_amount,tip_amount
16126,1,40.8,10.7
16127,1,7.2,2.55
16128,0,17.2,0
16129,0,22.06,0
16130,1,5.1,1
16131,1,16.3,4.41
16132,1,42.9,11.12
"""
total = 0.0
rows = 0
for chunk in pd.read_csv(io.StringIO(csv_text), chunksize=3, usecols=["fare_amount"]):
    print(len(chunk), list(chunk.columns))
    total += chunk["fare_amount"].sum()
    rows += len(chunk)
print(rows, round(total, 2))
`,
        output: "3 ['fare_amount']\n3 ['fare_amount']\n1 ['fare_amount']\n7 151.56\n",
        note: "Seven rows arrive as 3 + 3 + 1. Only the requested column is ever loaded. The running total and row count are all that is kept between chunks.",
      },
      {
        kind: "error-example",
        title: "Asking a chunk reader for its length",
        code: src`
import io
import pandas as pd

reader = pd.read_csv(io.StringIO("trip_id,fare_amount\n16126,40.8\n16127,7.2\n"), chunksize=1)
print(len(reader))
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: object of type 'TextFileReader' has no len()`. The reader doesn't know how many rows there are until it has read them all; that is the point. Count while you loop.",
      },
      {
        kind: "example",
        title: "Average fare per payment type, exactly",
        code: src`
import io
import pandas as pd

csv_text = """trip_id,payment_type_id,fare_amount
16126,1,40.8
16127,1,7.2
16128,0,17.2
16129,0,22.06
16130,1,5.1
16131,1,16.3
16132,1,42.9
"""
sums, counts, chunk_means = {}, {}, []
for chunk in pd.read_csv(io.StringIO(csv_text), chunksize=4):
    part = chunk.groupby("payment_type_id")["fare_amount"].agg(["sum", "count"])
    for kind, row in part.iterrows():
        sums[kind] = sums.get(kind, 0) + row["sum"]
        counts[kind] = counts.get(kind, 0) + row["count"]
    chunk_means.append(chunk.loc[chunk["payment_type_id"] == 1, "fare_amount"].mean())
print({int(k): round(float(sums[k] / counts[k]), 2) for k in sorted(sums)})
print(round(sum(chunk_means) / len(chunk_means), 2), "is the wrong card average")
`,
        output: "{0: 19.63, 1: 22.46}\n22.72 is the wrong card average\n",
        note: "Card trips (type 1) are 2 in the first chunk and 3 in the second. Adding sums and counts gives the true mean, 112.3 / 5 = 22.46. Averaging the two chunk means (24.0 and 21.43, giving 22.72) weights 2 trips the same as 3. `iterrows()` walks a small DataFrame row by row, giving each row's label and values.",
      },
      {
        kind: "text",
        md: "**When to use it:** files larger than you want in memory, or streams you process once. Use `usecols` always. **Mistakes to avoid:** averaging averages (keep sums and counts); medians and other order statistics can't be combined from chunk results at all (use an approach built for them, or a database); a chunk boundary can split a group, so never assume one chunk holds a whole customer or day; and reusing a reader that is already exhausted.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Count rows while you go",
      prompt: "`count_and_total` adds up fares chunk by chunk but returns 0 rows. Count the rows of every chunk as well.",
      spec: [
        ["Function", "`count_and_total(path)`"],
        ["Returns", "`(rows, total_fare)`"],
      ],
      starter: src`
import pandas as pd

def count_and_total(path):
    rows = 0
    total = 0.0
    for chunk in pd.read_csv(path, chunksize=5, usecols=["fare_amount"]):
        total += chunk["fare_amount"].sum()
    return rows, total

print(count_and_total("trips.csv"))
`,
      answer: src`
import pandas as pd

def count_and_total(path):
    rows = 0
    total = 0.0
    for chunk in pd.read_csv(path, chunksize=5, usecols=["fare_amount"]):
        total += chunk["fare_amount"].sum()
        rows += len(chunk)
    return rows, total

print(count_and_total("trips.csv"))
`,
      wrong: [
        {
          code: src`
import pandas as pd

def count_and_total(path):
    rows = 0
    total = 0.0
    for chunk in pd.read_csv(path, chunksize=5, usecols=["fare_amount"]):
        total += chunk["fare_amount"].sum()
        rows += 1
    return rows, total
`,
          fails: ["returns"],
          why: "it counts chunks, not rows",
        },
      ],
      hints: ["A running count works like the running total.", "Each chunk is a DataFrame with some rows.", "Add the chunk's length inside the loop."],
      task: {
        packages: PDONLY,
        files: { "trips.csv": TRIPS_CSV, "one.csv": "trip_id,fare_amount\n1,12.5\n" },
        checks: [
          fn("returns", "count_and_total", [
            example(["trips.csv"], { t: "tuple", items: [{ t: "int", v: "14" }, { t: "float", v: 287.79 }] }),
            hiddenCase("a single row", ["one.csv"], { t: "tuple", items: [{ t: "int", v: "1" }, { t: "float", v: 12.5 }] }),
          ], { label: "count_and_total() counts rows and totals fares across chunks", compare: loose }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Long trips, counted chunk by chunk",
        prompt: "Write `count_long_trips(path, min_miles, chunksize)`: read the trips CSV in chunks of `chunksize` rows, loading only `trip_distance_miles`, and return how many trips were at least `min_miles` long.",
        spec: [
          ["Function", "`count_long_trips(path, min_miles, chunksize)`"],
          ["Returns", "an int"],
          ["Rules", "read with `chunksize`; a trip exactly `min_miles` long counts"],
        ],
        starter: src`
import pandas as pd

def count_long_trips(path, min_miles, chunksize):
    return 0

print(count_long_trips("trips.csv", 5, 4))
`,
        answer: src`
import pandas as pd

def count_long_trips(path, min_miles, chunksize):
    count = 0
    for chunk in pd.read_csv(path, chunksize=chunksize, usecols=["trip_distance_miles"]):
        count += int((chunk["trip_distance_miles"] >= min_miles).sum())
    return count

print(count_long_trips("trips.csv", 5, 4))
`,
        alternatives: [
          src`
import pandas as pd

def count_long_trips(path, min_miles, chunksize):
    reader = pd.read_csv(path, chunksize=chunksize, usecols=["trip_distance_miles"])
    return sum(len(chunk[chunk["trip_distance_miles"] >= min_miles]) for chunk in reader)
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def count_long_trips(path, min_miles, chunksize):
    count = 0
    for chunk in pd.read_csv(path, chunksize=chunksize, usecols=["trip_distance_miles"]):
        count += int((chunk["trip_distance_miles"] > min_miles).sum())
    return count
`,
            fails: ["returns"],
            why: "a trip of exactly the minimum is not counted",
          },
          {
            code: src`
import pandas as pd

def count_long_trips(path, min_miles, chunksize):
    reader = pd.read_csv(path, chunksize=chunksize, usecols=["trip_distance_miles"])
    first = next(iter(reader))
    return int((first["trip_distance_miles"] >= min_miles).sum())
`,
            fails: ["returns"],
            why: "only the first chunk is counted",
          },
        ],
        hints: [
          "Loop over the reader and keep a running count.",
          "In each chunk, a comparison gives True/False per trip, and True counts as 1.",
          "Load only the one column you need.",
        ],
        task: {
          packages: PDONLY,
          files: { "trips.csv": TRIPS_CSV, "edge.csv": "trip_id,trip_distance_miles\n1,5.0\n2,4.99\n3,5.01\n" },
          checks: [
            fn("returns", "count_long_trips", [
              example(["trips.csv", 5, 4], 5),
              example(["trips.csv", 0, 14], 14),
              example(["trips.csv", 100, 3], 0),
              hiddenCase("a trip exactly at the minimum", ["edge.csv", 5, 1], 2),
              hiddenCase("a chunk size larger than the file", ["trips.csv", 9, 1000], 2),
              hiddenCase("one row per chunk", ["trips.csv", 3, 1], 8),
            ], { label: "count_long_trips() counts trips at or above the minimum across all chunks" }),
            usesSource("chunked", "Reads the file in chunks", "chunksize"),
          ],
        },
      },
      {
        id: "c2",
        title: "Tip rate per payment type across chunks",
        prompt: "Write `tip_rates(path, chunksize)`: read the trips CSV in chunks (only `payment_type_id`, `fare_amount`, `tip_amount`) and return, per payment type, total tips divided by total fares over the **whole** file.",
        spec: [
          ["Function", "`tip_rates(path, chunksize)`"],
          ["Returns", "`{payment_type_id: tips / fares}`"],
          ["Rules", "the answer must not depend on `chunksize`"],
        ],
        starter: src`
import pandas as pd

def tip_rates(path, chunksize):
    return {}

print(tip_rates("trips.csv", 4))
`,
        answer: src`
import pandas as pd

def tip_rates(path, chunksize):
    tips, fares = {}, {}
    columns = ["payment_type_id", "fare_amount", "tip_amount"]
    for chunk in pd.read_csv(path, chunksize=chunksize, usecols=columns):
        part = chunk.groupby("payment_type_id")[["tip_amount", "fare_amount"]].sum()
        for kind, row in part.iterrows():
            tips[kind] = tips.get(kind, 0) + row["tip_amount"]
            fares[kind] = fares.get(kind, 0) + row["fare_amount"]
    return {kind: tips[kind] / fares[kind] for kind in tips}

print(tip_rates("trips.csv", 4))
`,
        alternatives: [
          src`
import pandas as pd

def tip_rates(path, chunksize):
    parts = []
    for chunk in pd.read_csv(path, chunksize=chunksize, usecols=["payment_type_id", "fare_amount", "tip_amount"]):
        parts.append(chunk.groupby("payment_type_id")[["tip_amount", "fare_amount"]].sum())
    totals = pd.concat(parts).groupby(level=0).sum()
    return (totals["tip_amount"] / totals["fare_amount"]).to_dict()
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def tip_rates(path, chunksize):
    rates = {}
    counts = {}
    for chunk in pd.read_csv(path, chunksize=chunksize, usecols=["payment_type_id", "fare_amount", "tip_amount"]):
        part = chunk.groupby("payment_type_id")[["tip_amount", "fare_amount"]].sum()
        for kind, row in part.iterrows():
            rates[kind] = rates.get(kind, 0) + row["tip_amount"] / row["fare_amount"]
            counts[kind] = counts.get(kind, 0) + 1
    return {kind: rates[kind] / counts[kind] for kind in rates}
`,
            fails: ["returns"],
            why: "averaging per-chunk rates makes the answer depend on where the chunks split",
          },
          {
            code: src`
import pandas as pd

def tip_rates(path, chunksize):
    tips, fares = {}, {}
    for chunk in pd.read_csv(path, chunksize=chunksize, usecols=["payment_type_id", "fare_amount", "tip_amount"]):
        part = chunk.groupby("payment_type_id")[["tip_amount", "fare_amount"]].sum()
        for kind, row in part.iterrows():
            tips[kind] = row["tip_amount"]
            fares[kind] = row["fare_amount"]
    return {kind: tips[kind] / fares[kind] for kind in tips}
`,
            fails: ["returns"],
            why: "each chunk overwrites the totals instead of adding to them",
          },
        ],
        hints: [
          "A ratio of totals needs the two totals, not the ratios.",
          "Per chunk, group and sum both columns; then add those sums into running totals per payment type.",
          "Divide only at the end.",
        ],
        task: {
          packages: PDONLY,
          files: { "trips.csv": TRIPS_CSV },
          checks: [
            fn("returns", "tip_rates", [
              example(["trips.csv", 4], { t: "dict", entries: [[{ t: "int", v: "1" }, { t: "float", v: 0.2807660283097419 }], [{ t: "int", v: "0" }, { t: "float", v: 0 }]] }),
              example(["trips.csv", 14], { t: "dict", entries: [[{ t: "int", v: "1" }, { t: "float", v: 0.2807660283097419 }], [{ t: "int", v: "0" }, { t: "float", v: 0 }]] }),
              example(["trips.csv", 1], { t: "dict", entries: [[{ t: "int", v: "1" }, { t: "float", v: 0.2807660283097419 }], [{ t: "int", v: "0" }, { t: "float", v: 0 }]] }),
              hiddenCase("chunks of 3, which split the card trips unevenly", ["trips.csv", 3], { t: "dict", entries: [[{ t: "int", v: "1" }, { t: "float", v: 0.2807660283097419 }], [{ t: "int", v: "0" }, { t: "float", v: 0 }]] }),
              hiddenCase("chunks of 5", ["trips.csv", 5], { t: "dict", entries: [[{ t: "int", v: "1" }, { t: "float", v: 0.2807660283097419 }], [{ t: "int", v: "0" }, { t: "float", v: 0 }]] }),
            ], { label: "tip_rates() gives the same exact rates for any chunk size", compare: loose }),
            usesSource("chunked", "Reads the file in chunks", "chunksize"),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import io
import pandas as pd

text = "fare\n10\n20\n30\n40\n50\n"
sizes = [len(c) for c in pd.read_csv(io.StringIO(text), chunksize=2)]
print(sizes)
`,
        choices: ["[2, 2, 1]", "[2, 2, 2]", "[2, 3]", "[5]"],
        answer: 0,
        why: "Five rows in chunks of 2: two full chunks and one with the remaining row.",
      },
      {
        id: "q2",
        prompt: "A common mistake: averaging chunk averages. What does this print?",
        program: src`
import io
import pandas as pd

text = "fare\n10\n10\n10\n40\n"
means = [c["fare"].mean() for c in pd.read_csv(io.StringIO(text), chunksize=3)]
print(sum(means) / len(means), pd.read_csv(io.StringIO(text))["fare"].mean())
`,
        choices: ["25.0 17.5", "17.5 17.5", "25.0 25.0", "10.0 17.5"],
        answer: 0,
        why: "The chunks are [10, 10, 10] and [40], with means 10 and 40. Their average, 25, gives the single 40 as much weight as three tens; the true mean is 70 / 4 = 17.5.",
      },
      {
        id: "q3",
        prompt: "Which result can NOT be combined exactly from per-chunk results?",
        choices: ["The median fare", "The total fare", "The number of trips", "The largest fare"],
        answer: 0,
        why: "Totals and counts add up, and the maximum of chunk maxima is the maximum. A median needs the whole sorted data; chunk medians don't combine.",
      },
    ],
    review: [
      "`read_csv(path, chunksize=n, usecols=[...])` yields DataFrames of up to n rows; memory holds one at a time.",
      "Combine sums and counts across chunks; divide at the end.",
      "Averages of averages, and medians, don't combine.",
      "Next: let a database do the work with SQL.",
    ],
  },

  // ------------------------------------------------------------------ PY-L45-03 SQLite and DuckDB
  {
    id: "PY-L45-03",
    version: 2,
    slug: "sql-with-sqlite-and-duckdb",
    title: "SQL with SQLite and DuckDB",
    lede: "pandas can send SQL to SQLite and get a DataFrame back, with ? parameters keeping values out of the query text. DuckDB runs analytical SQL directly on DataFrames and files.",
    focus: "Move data between pandas and SQL: to_sql and read_sql_query with ? parameters on SQLite, and DuckDB queries over DataFrames and CSV files.",
    minutes: 20,
    objectives: [
      "Store a DataFrame in SQLite with `to_sql` and query it with `pd.read_sql_query(sql, conn, params=...)`",
      "Pass values as `?` parameters, never by pasting them into the SQL text",
      "Query a DataFrame or a CSV file with `duckdb.sql(...)` and get a DataFrame back with `.df()`",
    ],
    requires: ["assignment", "boolean", "dict-literal", "function-def", "function-doc", "function-param", "function-return", "import-alias", "import-module", "len-call", "list-index", "list-literal", "membership", "np-dtype", "pd-frame", "print-call", "print-several", "print-text", "sqlite-call", "string-format", "string-index", "top-level-indent", "tuple-literal", "unquoted-name"],
    teaches: ["duck-ask"],
    packages: DUCK,
    blocks: [
      {
        kind: "text",
        md: "In the Packaging & Databases module you ran SQL against SQLite with `sqlite3`. pandas connects to the same connection: `df.to_sql(\"trips\", conn, index=False)` creates a table and inserts every row, and `pd.read_sql_query(sql, conn, params=(...))` runs a query and returns a DataFrame. Values go in as `?` parameters, exactly as with `execute`, so a value can never change the query.\n\n**DuckDB** is a database built for analysis that runs inside your program. `duckdb.sql(\"SELECT … FROM trips\")` can name a DataFrame variable as if it were a table, or a CSV or Parquet file by its path. `.df()` turns the result into a DataFrame and `.fetchall()` into a list of tuples.",
      },
      {
        kind: "example",
        title: "Trips in SQLite, queried with a parameter",
        code: src`
import sqlite3
import pandas as pd

trips = pd.DataFrame({
    "trip_id": [16126, 16127, 16128, 16129, 16130],
    "payment_type_id": [1, 1, 0, 0, 1],
    "fare_amount": [40.8, 7.2, 17.2, 22.06, 5.1],
})
conn = sqlite3.connect(":memory:")
trips.to_sql("trips", conn, index=False)
query = "SELECT trip_id, fare_amount FROM trips WHERE fare_amount >= ? ORDER BY fare_amount DESC"
print(pd.read_sql_query(query, conn, params=(17.2,)))
counts = pd.read_sql_query("SELECT payment_type_id, COUNT(*) AS n FROM trips GROUP BY payment_type_id", conn)
print(counts.to_dict("records"))
conn.close()
`,
        output: "   trip_id  fare_amount\n0    16126        40.80\n1    16129        22.06\n2    16128        17.20\n[{'payment_type_id': 0, 'n': 2}, {'payment_type_id': 1, 'n': 3}]\n",
        note: "The threshold travels as a parameter; the SQL text never changes. The query result is a normal DataFrame.",
      },
      {
        kind: "error-example",
        title: "A table name that doesn't exist",
        code: src`
import sqlite3
import pandas as pd

conn = sqlite3.connect(":memory:")
pd.DataFrame({"trip_id": [16126]}).to_sql("trips", conn, index=False)
print(pd.read_sql_query("SELECT * FROM trip", conn))
`,
        error: "DatabaseError",
        output: "",
        note: "`DatabaseError: Execution failed on sql 'SELECT * FROM trip': no such table: trip`. pandas wraps the database's own error; the message names the problem.",
      },
      {
        kind: "example",
        title: "DuckDB over a DataFrame and a CSV file",
        code: src`
import duckdb
import pandas as pd

zones = pd.DataFrame({"zone_id": [186, 264, 39, 100, 263], "borough": ["Manhattan", "Unknown", "Brooklyn", "Manhattan", "Manhattan"]})
pd.DataFrame({
    "trip_id": [16126, 16127, 16128, 16129, 16130],
    "pickup_zone_id": [186, 264, 39, 100, 263],
    "fare_amount": [40.8, 7.2, 17.2, 22.06, 5.1],
}).to_csv("trips.csv", index=False)
report = duckdb.sql("""
    SELECT z.borough, COUNT(*) AS trips, ROUND(AVG(t.fare_amount), 2) AS avg_fare
    FROM 'trips.csv' AS t JOIN zones AS z ON t.pickup_zone_id = z.zone_id
    GROUP BY z.borough
    ORDER BY trips DESC, z.borough
""").df()
print(report)
`,
        output: "     borough  trips  avg_fare\n0  Manhattan      3     22.65\n1   Brooklyn      1     17.20\n2    Unknown      1      7.20\n",
        note: "One query reads the CSV file, joins it to a DataFrame variable called `zones`, groups and sorts. DuckDB finds `zones` among the program's variables.",
      },
      {
        kind: "text",
        md: "**When to use which:** SQLite when the data lives in a database file that other programs also use; DuckDB for analytical queries (joins, group by, window functions) over files and DataFrames, often faster than pandas on big inputs; pandas for step-by-step work in Python. **Mistakes to avoid:** building SQL with f-strings from values (use `?`); forgetting `index=False` in `to_sql`; and assuming a query's row order without `ORDER BY`.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Parameters for both ends of a range",
      prompt: "`fares_between` only applies the lower bound. Add an upper bound as a second `?` parameter so it returns trips with `low <= fare_amount <= high`.",
      spec: [
        ["Function", "`fares_between(conn, low, high)`"],
        ["Returns", "the matching trip IDs, smallest fare first"],
      ],
      starter: src`
import sqlite3
import pandas as pd

def fares_between(conn, low, high):
    query = "SELECT trip_id FROM trips WHERE fare_amount >= ? ORDER BY fare_amount"
    return pd.read_sql_query(query, conn, params=(low,))["trip_id"].tolist()

conn = sqlite3.connect(":memory:")
pd.DataFrame({"trip_id": [16126, 16127, 16128], "fare_amount": [40.8, 7.2, 17.2]}).to_sql("trips", conn, index=False)
print(fares_between(conn, 5, 20))
`,
      answer: src`
import sqlite3
import pandas as pd

def fares_between(conn, low, high):
    query = "SELECT trip_id FROM trips WHERE fare_amount >= ? AND fare_amount <= ? ORDER BY fare_amount"
    return pd.read_sql_query(query, conn, params=(low, high))["trip_id"].tolist()

conn = sqlite3.connect(":memory:")
pd.DataFrame({"trip_id": [16126, 16127, 16128], "fare_amount": [40.8, 7.2, 17.2]}).to_sql("trips", conn, index=False)
print(fares_between(conn, 5, 20))
`,
      alternatives: [
        src`
import pandas as pd

def fares_between(conn, low, high):
    query = "SELECT trip_id FROM trips WHERE fare_amount BETWEEN ? AND ? ORDER BY fare_amount"
    return pd.read_sql_query(query, conn, params=[low, high])["trip_id"].tolist()
`,
      ],
      wrong: [
        {
          code: src`
import pandas as pd

def fares_between(conn, low, high):
    query = f"SELECT trip_id FROM trips WHERE fare_amount >= {low} AND fare_amount < {high} ORDER BY fare_amount"
    return pd.read_sql_query(query, conn)["trip_id"].tolist()
`,
          fails: ["returns", "parameters"],
          why: "the values are pasted into the SQL, and `<` drops a fare equal to the upper bound",
        },
      ],
      hints: ["Add a second condition joined with `AND`.", "Each value gets its own `?`.", "The `params` tuple holds the values in the order the `?` marks appear."],
      task: {
        packages: DUCK,
        checks: [
          { kind: "expr", id: "returns", label: "fares_between() keeps fares within both bounds, inclusive", expr: `import sqlite3 as _sq\n${frameSetup(tripRecords.map((t) => ({ trip_id: t.trip_id, fare_amount: t.fare_amount })))}\n_c = _sq.connect(':memory:')\n_df.to_sql('trips', _c, index=False)\nresult = [fares_between(_c, 5, 17.2), fares_between(_c, 40, 50)]`, expected: pv([[16130, 16127, 16134, 16135, 16138, 16131, 16128], [16126, 16132]]) },
          { kind: "expr", id: "parameters", label: "Values are passed as parameters, not pasted into the SQL", expr: "import ast as _ast\n_fn = [n for n in _ast.walk(_ast.parse(_source)) if isinstance(n, _ast.FunctionDef) and n.name == 'fares_between']\nresult = bool(_fn) and not any(isinstance(n, _ast.JoinedStr) for n in _ast.walk(_fn[0]))", expected: pv(true) },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "Top trips from a payment type, safely",
        prompt: "Write `top_trips(conn, payment_type, limit)`: from the `trips` table of the SQLite connection, return the IDs of the `limit` trips with the highest `total_amount` for that payment type, highest first (ties by `trip_id`, ascending). Pass every value as a `?` parameter.",
        spec: [
          ["Function", "`top_trips(conn, payment_type, limit)`"],
          ["Returns", "a list of trip IDs"],
          ["Rules", "no values inside the SQL text: `payment_type` and `limit` are parameters (`LIMIT ?` works in SQLite)"],
        ],
        starter: src`
import sqlite3
import pandas as pd

def top_trips(conn, payment_type, limit):
    return []

conn = sqlite3.connect(":memory:")
pd.read_csv("trips.csv").to_sql("trips", conn, index=False)
print(top_trips(conn, 1, 3))
`,
        answer: src`
import sqlite3
import pandas as pd

def top_trips(conn, payment_type, limit):
    query = """
        SELECT trip_id FROM trips
        WHERE payment_type_id = ?
        ORDER BY total_amount DESC, trip_id
        LIMIT ?
    """
    return pd.read_sql_query(query, conn, params=(payment_type, limit))["trip_id"].tolist()

conn = sqlite3.connect(":memory:")
pd.read_csv("trips.csv").to_sql("trips", conn, index=False)
print(top_trips(conn, 1, 3))
`,
        alternatives: [
          src`
def top_trips(conn, payment_type, limit):
    rows = conn.execute(
        "SELECT trip_id FROM trips WHERE payment_type_id = ? ORDER BY total_amount DESC, trip_id LIMIT ?",
        (payment_type, limit),
    ).fetchall()
    return [r[0] for r in rows]
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def top_trips(conn, payment_type, limit):
    query = "SELECT trip_id FROM trips WHERE payment_type_id = ? ORDER BY total_amount LIMIT ?"
    return pd.read_sql_query(query, conn, params=(payment_type, limit))["trip_id"].tolist()
`,
            fails: ["returns", "returns-hidden"],
            why: "without `DESC` it returns the cheapest trips",
          },
          {
            code: src`
import pandas as pd

def top_trips(conn, payment_type, limit):
    query = "SELECT trip_id FROM trips WHERE payment_type_id = " + str(payment_type) + " ORDER BY total_amount DESC, trip_id LIMIT " + str(limit)
    return pd.read_sql_query(query, conn)["trip_id"].tolist()
`,
            fails: ["parameters"],
            why: "the results are right, but the values are glued into the SQL text",
          },
        ],
        hints: [
          "Filter, order, then limit, all in SQL.",
          "Two values, two `?` marks, one `params` tuple.",
          "The second sort key settles ties.",
        ],
        task: {
          packages: DUCK,
          files: { "trips.csv": TRIPS_CSV },
          checks: [
            { kind: "expr", id: "returns", label: "top_trips() returns the most expensive trips of that payment type", show: "top_trips(conn, 1, 3)", expr: "import sqlite3 as _sq\nimport pandas as _pd\n_c = _sq.connect(':memory:')\n_pd.read_csv('trips.csv').to_sql('trips', _c, index=False)\nresult = [top_trips(_c, 1, 3), top_trips(_c, 0, 10)]", expected: pv([[16132, 16126, 16136], [16129, 16128, 16135]]) },
            { kind: "expr", id: "returns-hidden", label: "Works for other tables (a tie on total, a limit of 1, an unknown payment type)", hidden: true, expr: `import sqlite3 as _sq\n${frameSetup([{ trip_id: 3, payment_type_id: 2, total_amount: 20 }, { trip_id: 1, payment_type_id: 2, total_amount: 20 }, { trip_id: 2, payment_type_id: 2, total_amount: 5 }])}\n_c = _sq.connect(':memory:')\n_df.to_sql('trips', _c, index=False)\nresult = [top_trips(_c, 2, 2), top_trips(_c, 2, 1), top_trips(_c, 9, 5)]`, expected: pv([[1, 3], [1], []]) },
            { kind: "expr", id: "parameters", label: "Values are passed as ? parameters", expr: "import ast as _ast\n_fn = [n for n in _ast.walk(_ast.parse(_source)) if isinstance(n, _ast.FunctionDef) and n.name == 'top_trips']\nresult = bool(_fn) and not any(isinstance(n, (_ast.JoinedStr, _ast.BinOp)) for n in _ast.walk(_fn[0])) and '?' in _ast.unparse(_fn[0])", expected: pv(true) },
          ],
        },
      },
      {
        id: "c2",
        title: "A borough report with DuckDB",
        prompt: "Write `borough_report(trips, zones)`: with one DuckDB query over the two DataFrames, return a DataFrame with one row per pickup borough: `borough`, `trips` (count), `revenue` (sum of `total_amount`, rounded to 2 decimals), ordered by revenue, highest first. Trips whose zone isn't in `zones` count under the borough `Unknown`.",
        spec: [
          ["Function", "`borough_report(trips, zones)`"],
          ["Returns", "a DataFrame with columns `borough, trips, revenue`"],
        ],
        starter: src`
import duckdb
import pandas as pd

def borough_report(trips, zones):
    return trips

trips = pd.read_csv("trips.csv")
zones = pd.read_csv("zones.csv")
print(borough_report(trips, zones))
`,
        answer: src`
import duckdb
import pandas as pd

def borough_report(trips, zones):
    return duckdb.sql("""
        SELECT COALESCE(z.borough, 'Unknown') AS borough,
               COUNT(*) AS trips,
               ROUND(SUM(t.total_amount), 2) AS revenue
        FROM trips AS t
        LEFT JOIN zones AS z ON t.pickup_zone_id = z.zone_id
        GROUP BY 1
        ORDER BY revenue DESC
    """).df()

trips = pd.read_csv("trips.csv")
zones = pd.read_csv("zones.csv")
print(borough_report(trips, zones))
`,
        alternatives: [
          src`
import duckdb

def borough_report(trips, zones):
    con = duckdb.connect()
    con.register("t", trips)
    con.register("z", zones)
    result = con.execute(
        "SELECT IFNULL(z.borough, 'Unknown') AS borough, COUNT(*) AS trips, ROUND(SUM(t.total_amount), 2) AS revenue "
        "FROM t LEFT JOIN z ON t.pickup_zone_id = z.zone_id GROUP BY IFNULL(z.borough, 'Unknown') ORDER BY revenue DESC"
    ).df()
    con.close()
    return result
`,
        ],
        wrong: [
          {
            code: src`
import duckdb

def borough_report(trips, zones):
    return duckdb.sql("""
        SELECT z.borough AS borough, COUNT(*) AS trips, ROUND(SUM(t.total_amount), 2) AS revenue
        FROM trips AS t JOIN zones AS z ON t.pickup_zone_id = z.zone_id
        GROUP BY 1 ORDER BY revenue DESC
    """).df()
`,
            fails: ["rows-hidden"],
            why: "the inner join drops trips whose zone isn't listed",
          },
          {
            code: src`
import duckdb

def borough_report(trips, zones):
    return duckdb.sql("""
        SELECT COALESCE(z.borough, 'Unknown') AS borough, COUNT(*) AS trips, ROUND(SUM(t.total_amount), 2) AS revenue
        FROM trips AS t LEFT JOIN zones AS z ON t.pickup_zone_id = z.zone_id
        GROUP BY 1 ORDER BY trips DESC
    """).df()
`,
            fails: ["rows"],
            why: "the rows are ordered by trip count, not by revenue",
          },
        ],
        hints: [
          "Join trips to zones on the zone ID, keeping every trip.",
          "A trip with no matching zone has a NULL borough: replace it in the SELECT.",
          "Group by that borough expression, aggregate, and order by revenue.",
        ],
        task: {
          packages: DUCK,
          files: {
            "trips.csv": TRIPS_CSV,
            "zones.csv": "zone_id,zone_name,borough\n" + zoneRecords.map((z) => `${z.zone_id},${z.zone_name},${z.borough}`).join("\n") + "\n",
          },
          checks: [
            frameRows("rows", "borough_report() has one row per borough, highest revenue first", "borough_report(_pd.read_csv('trips.csv'), _pd.read_csv('zones.csv'))", [
              { borough: "Manhattan", trips: 10, revenue: 328.62 },
              { borough: "Queens", trips: 1, revenue: 66.71 },
              { borough: "Brooklyn", trips: 2, revenue: 28.53 },
              { borough: "Unknown", trips: 1, revenue: 15.5 },
            ], { setup: "import pandas as _pd", show: "borough_report(trips, zones)", compare: loose }),
            frameRows("rows-hidden", "Works for other trips (a zone that isn't listed)", "borough_report(_df, _pd.DataFrame({'zone_id': [1], 'zone_name': ['Newark Airport'], 'borough': ['EWR']}))", [
              { borough: "Unknown", trips: 2, revenue: 30.0 },
              { borough: "EWR", trips: 1, revenue: 10.0 },
            ], { hidden: true, compare: loose, setup: frameSetup([{ trip_id: 1, pickup_zone_id: 1, total_amount: 10 }, { trip_id: 2, pickup_zone_id: 999, total_amount: 20 }, { trip_id: 3, pickup_zone_id: 998, total_amount: 10 }]) }),
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import duckdb
import pandas as pd

fares = pd.DataFrame({"payment_type_id": [1, 1, 0, 1], "fare_amount": [40.8, 7.2, 17.2, 5.1]})
print(duckdb.sql("SELECT payment_type_id, COUNT(*), MAX(fare_amount) FROM fares GROUP BY 1 ORDER BY 1").fetchall())
`,
        choices: ["[(0, 1, 17.2), (1, 3, 40.8)]", "[(1, 3, 40.8), (0, 1, 17.2)]", "[(0, 1, 17.2)]", "[(0, 17.2), (1, 40.8)]"],
        answer: 0,
        why: "Two groups, ordered by payment type: type 0 has one trip, type 1 three, with maximum fares 17.2 and 40.8. `fetchall` gives tuples.",
      },
      {
        id: "q2",
        prompt: "A common mistake: pasting a value into the SQL. A search box sends `0 OR 1=1`. What does this print?",
        program: src`
import sqlite3
import pandas as pd

conn = sqlite3.connect(":memory:")
pd.DataFrame({"trip_id": [1, 2, 3], "payment_type_id": [0, 1, 2]}).to_sql("trips", conn, index=False)
typed = "0 OR 1=1"
pasted = pd.read_sql_query(f"SELECT trip_id FROM trips WHERE payment_type_id = {typed}", conn)
safe = pd.read_sql_query("SELECT trip_id FROM trips WHERE payment_type_id = ?", conn, params=(typed,))
print(len(pasted), len(safe))
`,
        choices: ["3 0", "1 1", "0 0", "3 3"],
        answer: 0,
        why: "Pasted in, the text becomes part of the query and `1=1` matches every row. As a parameter it is just a value, which equals no payment type.",
      },
      {
        id: "q3",
        prompt: "Which job fits DuckDB best?",
        choices: ["Grouping and joining a large Parquet file and a DataFrame with one SQL query", "Storing a small app's user accounts shared by several programs", "Drawing a bar chart", "Reading a CSV in chunks by hand"],
        answer: 0,
        why: "DuckDB is an in-process analytical database that queries files and DataFrames directly. A shared, transactional application database is SQLite's (or a server database's) job.",
      },
    ],
    review: [
      "`df.to_sql(name, conn, index=False)` stores a table; `pd.read_sql_query(sql, conn, params=...)` returns a DataFrame.",
      "Values always travel as `?` parameters.",
      "`duckdb.sql(...)` queries DataFrame variables and files; `.df()` and `.fetchall()` return the result.",
      "Next: make an analysis give the same answer every time it runs.",
    ],
  },

  // ------------------------------------------------------------------ PY-L45-04 reproducible analysis
  {
    id: "PY-L45-04",
    version: 2,
    slug: "reproducible-analysis",
    title: "Reproducible analysis",
    lede: "A result you can't reproduce can't be checked. Seed every random step, pass every setting in as a parameter, sort before you output, and fingerprint the result so two runs can be compared.",
    focus: "Make an analysis repeatable: seeded random generators, explicit parameters, deterministic ordering, and a hash of the output to compare runs.",
    minutes: 18,
    objectives: [
      "Draw repeatable random samples with `np.random.default_rng(seed)` and `sample(random_state=seed)`",
      "Write an analysis as a function of its inputs and parameters, with sorted, rounded output",
      "Fingerprint a result with `hashlib.sha256` of its CSV text and compare two runs",
    ],
    requires: ["arithmetic", "assignment", "boolean", "comparison", "conversion", "dict-literal", "dict-lookup", "for-loop", "function-def", "function-param", "function-return", "if-statement", "import-alias", "import-module", "len-call", "list-comp", "list-index", "list-literal", "list-mutate", "list-sort", "logical", "membership", "newline-escape", "np-array", "np-dtype", "np-reduce", "pd-filter", "pd-frame", "pd-group", "pd-loc", "print-call", "print-several", "print-text", "raise-stmt", "range-call", "reassignment", "string-format", "string-index", "string-slice", "top-level-indent", "tuple-literal", "unquoted-name"],
    teaches: ["repro-run"],
    packages: ["numpy", "pandas"],
    blocks: [
      {
        kind: "text",
        md: "Run an analysis twice and get two answers, and nobody can tell which is right. The usual causes: **random sampling without a seed**; **hidden settings** (a threshold typed in the middle of the code, a file path that changed); and **unstable order** (rows in whatever order a dictionary, a join or a group happened to produce). The fixes are small: create random generators with a **seed** (`np.random.default_rng(42)`, `df.sample(n, random_state=42)`), pass settings in as parameters, and sort the output by a key before saving it.\n\nTo check that two runs agree, compare a **fingerprint**: `hashlib.sha256(text.encode()).hexdigest()` turns any text (such as the CSV of the result) into a short code that changes if a single character changes.",
      },
      {
        kind: "example",
        title: "Same seed, same sample",
        code: src`
import numpy as np
import pandas as pd

trips = pd.DataFrame({"trip_id": [16126, 16127, 16128, 16129, 16130, 16131, 16132], "fare_amount": [40.8, 7.2, 17.2, 22.06, 5.1, 16.3, 42.9]})
first = np.random.default_rng(42).integers(0, 100, size=3).tolist()
again = np.random.default_rng(42).integers(0, 100, size=3).tolist()
print(first, first == again)
print(trips.sample(n=3, random_state=7)["trip_id"].tolist())
print(trips.sample(n=3, random_state=7)["trip_id"].tolist())
`,
        output: "[8, 77, 65] True\n[16128, 16131, 16126]\n[16128, 16131, 16126]\n",
        note: "A generator made with the same seed produces the same numbers, so a sample is the same on every run. The exact numbers can differ between NumPy or pandas versions, which is another reason to record the versions you used.",
      },
      {
        kind: "error-example",
        title: "Hashing a DataFrame directly",
        code: src`
import hashlib
import pandas as pd

result = pd.DataFrame({"payment_type_id": [0, 1], "avg_fare": [19.63, 22.46]})
print(hashlib.sha256(result).hexdigest())
`,
        error: "TypeError",
        output: "",
        note: "`TypeError: object supporting the buffer API required`. A hash works on bytes: turn the result into text first (`to_csv(index=False)`), then into bytes with `.encode()`.",
      },
      {
        kind: "example",
        title: "An analysis that fingerprints its own output",
        code: src`
import hashlib
import pandas as pd

def fare_summary(trips, min_fare):
    kept = trips[trips["fare_amount"] >= min_fare]
    summary = kept.groupby("payment_type_id", as_index=False)["fare_amount"].mean().round(2)
    return summary.sort_values("payment_type_id").reset_index(drop=True)

def fingerprint(table):
    return hashlib.sha256(table.to_csv(index=False).encode()).hexdigest()[:12]

trips = pd.DataFrame({"payment_type_id": [1, 1, 0, 0, 1], "fare_amount": [40.8, 7.2, 17.2, 22.06, 5.1]})
shuffled = trips.sample(frac=1, random_state=3)
a = fare_summary(trips, min_fare=6)
b = fare_summary(shuffled, min_fare=6)
print(a.to_dict("records"))
print(fingerprint(a) == fingerprint(b), fingerprint(a) == fingerprint(fare_summary(trips, min_fare=7.5)))
`,
        output: "[{'payment_type_id': 0, 'fare_amount': 19.63}, {'payment_type_id': 1, 'fare_amount': 24.0}]\nTrue False\n",
        note: "The same data in a different row order gives the same fingerprint, because the summary is sorted. A different parameter gives a different fingerprint, which is how you notice that a setting changed.",
      },
      {
        kind: "text",
        md: "**When to use it:** every analysis someone else (or you, next month) may rerun. **Mistakes to avoid:** unseeded randomness; settings that live in the middle of the code instead of in parameters; output whose row order depends on how the data arrived; comparing floats from different machines character by character (round first); and assuming the same seed gives the same sample across library versions.",
      },
    ],
    tryIt: {
      id: "try",
      title: "Seed the sample",
      prompt: "`audit_sample` picks trips for a manual audit, but a different set comes out every run. Make it take the sample with `random_state=seed`, so the same seed always gives the same trips.",
      spec: [
        ["Function", "`audit_sample(trips, n, seed)`"],
        ["Returns", "the sampled trip IDs, sorted"],
      ],
      starter: src`
import pandas as pd

def audit_sample(trips, n, seed):
    picked = trips.sample(n=n)
    return sorted(picked["trip_id"].tolist())

trips = pd.DataFrame({"trip_id": [16126, 16127, 16128, 16129, 16130, 16131, 16132]})
print(audit_sample(trips, 3, 7))
`,
      answer: src`
import pandas as pd

def audit_sample(trips, n, seed):
    picked = trips.sample(n=n, random_state=seed)
    return sorted(picked["trip_id"].tolist())

trips = pd.DataFrame({"trip_id": [16126, 16127, 16128, 16129, 16130, 16131, 16132]})
print(audit_sample(trips, 3, 7))
`,
      wrong: [
        {
          code: src`
import pandas as pd

def audit_sample(trips, n, seed):
    return sorted(trips["trip_id"].tolist())[:n]
`,
          fails: ["returns"],
          why: "always the first n trips: repeatable, but not a random sample at all",
        },
      ],
      hints: ["The sample call needs to know the seed.", "`sample` has a `random_state` argument.", "Pass `seed` to it."],
      task: {
        packages: ["numpy", "pandas"],
        checks: [
          { kind: "expr", id: "returns", label: "audit_sample() gives the seeded sample", expr: "import pandas as _pd\n_t = _pd.DataFrame({'trip_id': [16126, 16127, 16128, 16129, 16130, 16131, 16132]})\nresult = [audit_sample(_t, 3, 7), audit_sample(_t, 3, 7), audit_sample(_t, 2, 11)]", expected: pv([[16126, 16128, 16131], [16126, 16128, 16131], [16128, 16131]]) },
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A reproducible bootstrap estimate",
        prompt: "How sure is an average fare? A **bootstrap** resamples the fares with replacement many times and looks at the spread of the averages. Write `bootstrap_means(fares, rounds, seed)`: create **one** generator with `np.random.default_rng(seed)`, and for each round draw `len(fares)` fares with `rng.choice(fares, size=len(fares), replace=True)` and record their mean. Return the list of means rounded to 2 decimals. The same seed must give the same list.",
        spec: [
          ["Function", "`bootstrap_means(fares, rounds, seed)`"],
          ["Returns", "a list of `rounds` floats"],
          ["Raises", "`ValueError` when `fares` is empty"],
        ],
        starter: src`
import numpy as np

def bootstrap_means(fares, rounds, seed):
    return []

print(bootstrap_means([40.8, 7.2, 17.2, 22.06, 5.1], 3, 42))
`,
        answer: src`
import numpy as np

def bootstrap_means(fares, rounds, seed):
    if len(fares) == 0:
        raise ValueError("no fares to resample")
    rng = np.random.default_rng(seed)
    means = []
    for _ in range(rounds):
        draw = rng.choice(fares, size=len(fares), replace=True)
        means.append(round(float(draw.mean()), 2))
    return means

print(bootstrap_means([40.8, 7.2, 17.2, 22.06, 5.1], 3, 42))
`,
        alternatives: [
          src`
import numpy as np

def bootstrap_means(fares, rounds, seed):
    if not fares:
        raise ValueError("empty")
    rng = np.random.default_rng(seed)
    data = np.array(fares, dtype=float)
    return [round(float(rng.choice(data, size=data.size, replace=True).mean()), 2) for _ in range(rounds)]
`,
        ],
        wrong: [
          {
            code: src`
import numpy as np

def bootstrap_means(fares, rounds, seed):
    if len(fares) == 0:
        raise ValueError("no fares to resample")
    means = []
    for _ in range(rounds):
        rng = np.random.default_rng(seed)
        draw = rng.choice(fares, size=len(fares), replace=True)
        means.append(round(float(draw.mean()), 2))
    return means
`,
            fails: ["returns"],
            why: "a new generator with the same seed every round draws the same sample every time",
          },
          {
            code: src`
import numpy as np

def bootstrap_means(fares, rounds, seed):
    if len(fares) == 0:
        raise ValueError("no fares to resample")
    rng = np.random.default_rng()
    return [round(float(rng.choice(fares, size=len(fares)).mean()), 2) for _ in range(rounds)]
`,
            fails: ["returns"],
            why: "without the seed every run gives different numbers",
          },
        ],
        hints: [
          "Make the generator once, before the loop.",
          "Each round draws a new sample from the same generator.",
          "Round each mean as you record it; check for an empty list first.",
        ],
        task: {
          packages: ["numpy", "pandas"],
          checks: [
            fn("returns", "bootstrap_means", [
              example([[40.8, 7.2, 17.2, 22.06, 5.1], 3, 42], [23.86, 23.19, 17.7]),
              example([[10.0], 2, 1], [10.0, 10.0]),
              raisesCase([[], 5, 1], "ValueError"),
              hiddenCase("another seed", [[40.8, 7.2, 17.2, 22.06, 5.1], 2, 7], [14.3, 16.47]),
              hiddenCase("zero rounds", [[1.0, 2.0], 0, 3], []),
            ], { label: "bootstrap_means() resamples with one seeded generator", compare: loose }),
          ],
        },
      },
      {
        id: "c2",
        title: "A run fingerprint that ignores row order",
        prompt: "Write `report_fingerprint(trips, min_distance)`: keep trips with `trip_distance_miles` at least `min_distance`, compute per `payment_type_id` the number of trips and the mean `tip_amount` rounded to 2 decimals (columns `payment_type_id, trips, avg_tip`), sort by `payment_type_id`, and return the first 16 hex characters of the SHA-256 of the result's CSV text (`to_csv(index=False)`). The fingerprint must not depend on the order of the input rows.",
        spec: [
          ["Function", "`report_fingerprint(trips, min_distance)`"],
          ["Returns", "a 16-character text"],
        ],
        starter: src`
import hashlib
import pandas as pd

def report_fingerprint(trips, min_distance):
    return ""

trips = pd.read_csv("trips.csv")
print(report_fingerprint(trips, 2))
`,
        answer: src`
import hashlib
import pandas as pd

def report_fingerprint(trips, min_distance):
    kept = trips[trips["trip_distance_miles"] >= min_distance]
    report = kept.groupby("payment_type_id", as_index=False).agg(
        trips=("trip_id", "count"),
        avg_tip=("tip_amount", "mean"),
    )
    report["avg_tip"] = report["avg_tip"].round(2)
    report = report.sort_values("payment_type_id")
    return hashlib.sha256(report.to_csv(index=False).encode()).hexdigest()[:16]

trips = pd.read_csv("trips.csv")
print(report_fingerprint(trips, 2))
`,
        alternatives: [
          src`
import hashlib

def report_fingerprint(trips, min_distance):
    kept = trips.loc[trips["trip_distance_miles"] >= min_distance]
    groups = kept.groupby("payment_type_id")
    lines = ["payment_type_id,trips,avg_tip"]
    for kind in sorted(groups.groups):
        group = groups.get_group(kind)
        lines.append(f"{kind},{len(group)},{round(group['tip_amount'].mean(), 2)}")
    text = "\n".join(lines) + "\n"
    return hashlib.sha256(text.encode()).hexdigest()[:16]
`,
        ],
        wrong: [
          {
            code: src`
import hashlib

def report_fingerprint(trips, min_distance):
    kept = trips[trips["trip_distance_miles"] >= min_distance]
    report = kept.groupby("payment_type_id", as_index=False).agg(trips=("trip_id", "count"), avg_tip=("tip_amount", "mean"))
    report["avg_tip"] = report["avg_tip"].round(2)
    return hashlib.sha256(kept.to_csv(index=False).encode()).hexdigest()[:16]
`,
            fails: ["order", "returns"],
            why: "it fingerprints the filtered rows, whose order follows the input, not the summary",
          },
          {
            code: src`
import hashlib

def report_fingerprint(trips, min_distance):
    kept = trips[trips["trip_distance_miles"] >= min_distance]
    report = kept.groupby("payment_type_id", as_index=False).agg(trips=("trip_id", "count"), avg_tip=("tip_amount", "mean"))
    return hashlib.sha256(report.to_csv(index=False).encode()).hexdigest()[:16]
`,
            fails: ["returns"],
            why: "unrounded means print with many digits, so the text (and the fingerprint) differs from the report's",
          },
        ],
        hints: [
          "Build the summary table first; fingerprint the summary, not the raw rows.",
          "Round the mean, sort by the key, write CSV without the index.",
          "Encode the text to bytes, hash it, and keep the first 16 characters of the hex digest.",
        ],
        task: {
          packages: ["numpy", "pandas"],
          files: { "trips.csv": TRIPS_CSV },
          checks: [
            { kind: "expr", id: "returns", label: "report_fingerprint() hashes the rounded, sorted summary", show: "report_fingerprint(trips, 2)", expr: "import hashlib as _h\nimport pandas as _pd\n_t = _pd.read_csv('trips.csv')\n_text = 'payment_type_id,trips,avg_tip\\n0,2,0.0\\n1,8,7.56\\n'\nresult = report_fingerprint(_t, 2) == _h.sha256(_text.encode()).hexdigest()[:16]", expected: pv(true) },
            { kind: "expr", id: "order", label: "The fingerprint doesn't depend on row order", expr: "import pandas as _pd\n_t = _pd.read_csv('trips.csv')\nresult = report_fingerprint(_t, 1) == report_fingerprint(_t.iloc[::-1], 1)", expected: pv(true) },
            { kind: "expr", id: "returns-hidden", label: "A different setting gives a different fingerprint", hidden: true, expr: "import pandas as _pd\n_t = _pd.read_csv('trips.csv')\nresult = [len(report_fingerprint(_t, 2)), report_fingerprint(_t, 2) != report_fingerprint(_t, 5)]", expected: pv([16, true]) },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import numpy as np

a = np.random.default_rng(5)
b = np.random.default_rng(5)
first = a.integers(0, 1000, size=2).tolist()
print(first == b.integers(0, 1000, size=2).tolist(), first == a.integers(0, 1000, size=2).tolist())
`,
        choices: ["True False", "True True", "False False", "False True"],
        answer: 0,
        why: "Two generators with the same seed produce the same sequence. Asking the same generator again continues the sequence, so the next draw differs.",
      },
      {
        id: "q2",
        prompt: "A common mistake: hashing text that depends on row order. What does this print?",
        program: src`
import hashlib
import pandas as pd

t = pd.DataFrame({"k": [2, 1], "v": [5, 7]})
h1 = hashlib.sha256(t.to_csv(index=False).encode()).hexdigest()
h2 = hashlib.sha256(t.sort_values("k").to_csv(index=False).encode()).hexdigest()
print(h1 == h2, len(h1))
`,
        choices: ["False 64", "True 64", "False 32", "True 16"],
        answer: 0,
        why: "Same rows, different order, different text, different hash. A SHA-256 hex digest has 64 characters.",
      },
      {
        id: "q3",
        prompt: "Which change makes an analysis more reproducible?",
        choices: ["Passing the date range in as a parameter instead of typing it inside the code", "Using a new random seed every run", "Printing results without sorting", "Reading whichever file was modified most recently"],
        answer: 0,
        why: "An explicit parameter is saved with the run and can be repeated; the others make results depend on chance or on the state of the machine.",
      },
    ],
    review: [
      "Seed every random step: `np.random.default_rng(seed)`, `sample(random_state=seed)`; create the generator once.",
      "Pass settings as parameters and sort output by a key, so the same inputs give the same result.",
      "A SHA-256 of the result's CSV text is a fingerprint for comparing runs.",
      "Next: write results others can read back exactly.",
    ],
  },

  // ------------------------------------------------------------------ PY-L45-05 exports
  {
    id: "PY-L45-05",
    version: 2,
    slug: "export-results",
    title: "Exporting results",
    lede: "A result isn't finished until someone else can read it back exactly. Write CSV without the index and with a fixed number format, JSON with ISO dates, and check the file by reading it back.",
    focus: "Export DataFrames with to_csv (index=False, float_format) and to_json (orient=\"records\", lines, ISO dates), and verify the files by reading them back.",
    minutes: 18,
    objectives: [
      "Write CSV with `index=False` and `float_format=\"%.2f\"`, and explain the `Unnamed: 0` column",
      "Write JSON records and JSON Lines with `to_json(orient=\"records\", lines=..., date_format=\"iso\")`",
      "Read an export back (`read_csv`, `json.loads`) and compare it with what was meant",
    ],
    requires: ["arithmetic", "assignment", "boolean", "conversion", "csv-write", "dict-literal", "dict-lookup", "encoding-arg", "end", "file-open", "for-loop", "function-def", "function-param", "function-return", "import-alias", "import-module", "json-dumps", "json-loads", "len-call", "list-copy", "list-index", "list-literal", "list-mutate", "list-sort", "membership", "newline-escape", "none-value", "np-dtype", "pd-frame", "pd-group", "pd-loc", "pd-time", "print-call", "print-several", "print-text", "reassignment", "string-format", "string-index", "strptime-call", "top-level-indent", "tuple-literal", "with-statement"],
    teaches: ["pd-export"],
    packages: PDONLY,
    blocks: [
      {
        kind: "text",
        md: "Exports are read by other programs and other people. `to_csv(path)` writes the index as a first, unnamed column unless you pass `index=False`; read back, it turns into a column called `Unnamed: 0`. Floats are written with every digit unless you choose a format: `float_format=\"%.2f\"` writes money as cents. `to_json(path, orient=\"records\")` writes a list of objects, one per row; with `lines=True` it writes one JSON object per line (JSON Lines, the CSV JSON & JSONL module), which streaming tools prefer. `date_format=\"iso\"` writes timestamps as ISO 8601 text, the format every language can parse.",
      },
      {
        kind: "example",
        title: "CSV that reads back cleanly",
        code: src`
import pandas as pd

summary = pd.DataFrame({"borough": ["Manhattan", "Queens"], "trips": [9, 1], "revenue": [340.4, 66.71]})
summary.to_csv("with_index.csv")
summary.to_csv("summary.csv", index=False, float_format="%.2f")
print(pd.read_csv("with_index.csv").columns.tolist())
with open("summary.csv", encoding="utf-8") as f:
    print(f.read(), end="")
print(pd.read_csv("summary.csv").equals(summary))
`,
        output: "['Unnamed: 0', 'borough', 'trips', 'revenue']\nborough,trips,revenue\nManhattan,9,340.40\nQueens,1,66.71\nTrue\n",
        note: "The index became a nameless first column. With `index=False` and a fixed float format the file is exactly what a reader expects, and reading it back gives an equal table.",
      },
      {
        kind: "error-example",
        title: "Reading JSON Lines as one JSON document",
        code: src`
import pandas as pd

trips = pd.DataFrame({"trip_id": [16126, 16127], "fare_amount": [40.8, 7.2]})
trips.to_json("trips.jsonl", orient="records", lines=True)
pd.read_json("trips.jsonl")
`,
        error: "ValueError",
        output: "",
        note: "Two JSON objects on two lines are not one JSON document, so reading it as one fails (`ValueError: Trailing data`). JSON Lines needs `lines=True` on the way in, too.",
      },
      {
        kind: "example",
        title: "Trips as JSON Lines with ISO timestamps",
        code: src`
import json
import pandas as pd

trips = pd.DataFrame({
    "trip_id": [16126, 16127],
    "pickup_at": pd.to_datetime(["2025-01-15 00:12:47", "2025-01-15 00:18:28"]),
    "tip_amount": [10.7, None],
})
trips.to_json("trips.jsonl", orient="records", lines=True, date_format="iso")
with open("trips.jsonl", encoding="utf-8") as f:
    lines = f.read().splitlines()
print(lines[0])
print(json.loads(lines[1]))
print(pd.read_json("trips.jsonl", lines=True)["trip_id"].tolist())
`,
        output: "{\"trip_id\":16126,\"pickup_at\":\"2025-01-15T00:12:47.000\",\"tip_amount\":10.7}\n{'trip_id': 16127, 'pickup_at': '2025-01-15T00:18:28.000', 'tip_amount': None}\n[16126, 16127]\n",
        note: "Each line is one complete JSON object. The missing tip became JSON `null` (None in Python), and the timestamp is ISO text with a `T` between date and time.",
      },
      {
        kind: "text",
        md: "**When to use which:** CSV for tables people open in spreadsheets; JSON records for web APIs and nested consumers; JSON Lines for logs and large streams read one record at a time; Parquet (“Parquet files”) for typed data other programs reread. **Mistakes to avoid:** exporting the index by accident; floats like `22.459999999999997` in a report; dates in a local format nobody else parses; and never reading your own export back to check it.",
      },
    ],
    tryIt: {
      id: "try",
      title: "No index column",
      prompt: "`export_fares` writes the index as an extra first column. Write only the data columns.",
      spec: [
        ["Function", "`export_fares(table, path)`"],
        ["Writes", "a CSV with exactly the table's columns"],
      ],
      starter: src`
import pandas as pd

def export_fares(table, path):
    table.to_csv(path)

export_fares(pd.DataFrame({"trip_id": [16126, 16127], "fare_amount": [40.8, 7.2]}), "fares.csv")
print(pd.read_csv("fares.csv").columns.tolist())
`,
      answer: src`
import pandas as pd

def export_fares(table, path):
    table.to_csv(path, index=False)

export_fares(pd.DataFrame({"trip_id": [16126, 16127], "fare_amount": [40.8, 7.2]}), "fares.csv")
print(pd.read_csv("fares.csv").columns.tolist())
`,
      wrong: [
        {
          code: src`
import pandas as pd

def export_fares(table, path):
    table.to_csv(path, header=False)
`,
          fails: ["file"],
          why: "the header is gone but the index is still written",
        },
      ],
      hints: ["`to_csv` writes the index unless told not to.", "One argument controls it.", "Set it to False."],
      task: {
        packages: PDONLY,
        checks: [
          csvRows("file", "export_fares() writes the header and data, without the index", "_fares.csv", [["trip_id", "fare_amount"], ["16126", "40.8"], ["16127", "7.2"]], { setup: "import pandas as _pd\nexport_fares(_pd.DataFrame({'trip_id': [16126, 16127], 'fare_amount': [40.8, 7.2]}), '_fares.csv')" }),
        ],
      },
    },
    challenges: [
      {
        id: "c1",
        title: "A finance-ready summary CSV",
        prompt: "Write `export_payment_summary(trips, path)`: from a trips DataFrame, write a CSV with one row per `payment_type_id` (sorted ascending) and columns `payment_type_id`, `trips` (count), `revenue` (sum of `total_amount`) and `avg_tip` (mean `tip_amount`), money written with exactly 2 decimals, no index. Return the number of rows written.",
        spec: [
          ["Function", "`export_payment_summary(trips, path)`"],
          ["File", "header `payment_type_id,trips,revenue,avg_tip`; numbers like `335.16` and `6.18`"],
          ["Returns", "the number of data rows"],
        ],
        starter: src`
import pandas as pd

def export_payment_summary(trips, path):
    return 0

trips = pd.read_csv("trips.csv")
print(export_payment_summary(trips, "summary.csv"))
`,
        answer: src`
import pandas as pd

def export_payment_summary(trips, path):
    summary = trips.groupby("payment_type_id", as_index=False).agg(
        trips=("trip_id", "count"),
        revenue=("total_amount", "sum"),
        avg_tip=("tip_amount", "mean"),
    ).sort_values("payment_type_id")
    summary.to_csv(path, index=False, float_format="%.2f")
    return len(summary)

trips = pd.read_csv("trips.csv")
print(export_payment_summary(trips, "summary.csv"))
`,
        alternatives: [
          src`
import csv

def export_payment_summary(trips, path):
    groups = trips.groupby("payment_type_id")
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["payment_type_id", "trips", "revenue", "avg_tip"])
        for kind in sorted(groups.groups):
            g = groups.get_group(kind)
            writer.writerow([kind, len(g), f"{g['total_amount'].sum():.2f}", f"{g['tip_amount'].mean():.2f}"])
    return len(groups)
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def export_payment_summary(trips, path):
    summary = trips.groupby("payment_type_id", as_index=False).agg(
        trips=("trip_id", "count"),
        revenue=("total_amount", "sum"),
        avg_tip=("tip_amount", "mean"),
    )
    summary.to_csv(path, index=False)
    return len(summary)
`,
            fails: ["file", "file-hidden"],
            why: "money is written with every digit, such as `6.130909090909091`",
          },
          {
            code: src`
import pandas as pd

def export_payment_summary(trips, path):
    summary = trips.groupby("payment_type_id", as_index=False).agg(
        trips=("trip_id", "count"),
        revenue=("fare_amount", "sum"),
        avg_tip=("tip_amount", "mean"),
    )
    summary.to_csv(path, index=False, float_format="%.2f")
    return len(summary)
`,
            fails: ["file", "file-hidden"],
            why: "revenue adds up fares only, without tips, tolls and surcharges in `total_amount`",
          },
        ],
        hints: [
          "Group, aggregate with named columns, sort by the key.",
          "`float_format` decides how every float is written.",
          "Leave the index out; the count of rows is the length of the summary.",
        ],
        task: {
          packages: PDONLY,
          files: { "trips.csv": TRIPS_CSV },
          checks: [
            csvRows("file", "The CSV has one row per payment type with 2-decimal money", "_summary.csv", [
              ["payment_type_id", "trips", "revenue", "avg_tip"],
              ["0", "3", "55.34", "0.00"],
              ["1", "11", "384.02", "6.13"],
            ], { setup: "import pandas as _pd\n_n = export_payment_summary(_pd.read_csv('trips.csv'), '_summary.csv')", show: "export_payment_summary(trips, 'summary.csv')" }),
            { kind: "expr", id: "rows", label: "export_payment_summary() returns the number of rows written", expr: "import pandas as _pd\nresult = int(export_payment_summary(_pd.read_csv('trips.csv'), '_s2.csv'))", expected: pv(2) },
            csvRows("file-hidden", "Works for other trips (a payment type with one trip, sums ending in 0)", "_other.csv", [
              ["payment_type_id", "trips", "revenue", "avg_tip"],
              ["2", "1", "10.50", "0.00"],
              ["4", "2", "30.00", "1.25"],
            ], { hidden: true, setup: `${frameSetup([{ trip_id: 9, payment_type_id: 4, total_amount: 10, tip_amount: 0.5 }, { trip_id: 8, payment_type_id: 2, total_amount: 10.5, tip_amount: 0 }, { trip_id: 7, payment_type_id: 4, total_amount: 20, tip_amount: 2 }])}\nexport_payment_summary(_df, '_other.csv')` }),
          ],
        },
      },
      {
        id: "c2",
        title: "Export trips as JSON Lines for an API",
        prompt: "Write `export_trips_jsonl(trips, path)`: write one JSON object per line with only `trip_id`, `pickup_at` (as ISO text) and `fare_amount`, ordered by `pickup_at`. `pickup_at` arrives as text `YYYY-MM-DD HH:MM:SS`; parse it first so it is written in ISO form.",
        spec: [
          ["Function", "`export_trips_jsonl(trips, path)`"],
          ["File", "lines like `{\"trip_id\":16126,\"pickup_at\":\"2025-01-15T00:12:47.000\",\"fare_amount\":40.8}`"],
        ],
        starter: src`
import pandas as pd

def export_trips_jsonl(trips, path):
    pass

trips = pd.read_csv("trips.csv")
export_trips_jsonl(trips, "trips.jsonl")
`,
        answer: src`
import pandas as pd

def export_trips_jsonl(trips, path):
    out = trips[["trip_id", "pickup_at", "fare_amount"]].copy()
    out["pickup_at"] = pd.to_datetime(out["pickup_at"], format="%Y-%m-%d %H:%M:%S")
    out = out.sort_values("pickup_at")
    out.to_json(path, orient="records", lines=True, date_format="iso")

trips = pd.read_csv("trips.csv")
export_trips_jsonl(trips, "trips.jsonl")
`,
        alternatives: [
          src`
import json
from datetime import datetime

def export_trips_jsonl(trips, path):
    rows = trips.sort_values("pickup_at").to_dict("records")
    with open(path, "w", encoding="utf-8") as f:
        for row in rows:
            when = datetime.strptime(row["pickup_at"], "%Y-%m-%d %H:%M:%S")
            record = {"trip_id": int(row["trip_id"]), "pickup_at": when.strftime("%Y-%m-%dT%H:%M:%S.000"), "fare_amount": float(row["fare_amount"])}
            f.write(json.dumps(record, separators=(",", ":")) + "\n")
`,
        ],
        wrong: [
          {
            code: src`
import pandas as pd

def export_trips_jsonl(trips, path):
    out = trips[["trip_id", "pickup_at", "fare_amount"]].sort_values("pickup_at")
    out.to_json(path, orient="records", lines=True)
`,
            fails: ["records", "records-hidden"],
            why: "the time stays in its original text form instead of ISO",
          },
          {
            code: src`
import pandas as pd

def export_trips_jsonl(trips, path):
    out = trips.copy()
    out["pickup_at"] = pd.to_datetime(out["pickup_at"], format="%Y-%m-%d %H:%M:%S")
    out.sort_values("pickup_at").to_json(path, orient="records", lines=True, date_format="iso")
`,
            fails: ["records", "records-hidden"],
            why: "every column is exported, not just the three the API expects",
          },
        ],
        hints: [
          "Keep the three columns, on a copy.",
          "Parse the timestamps so `to_json` can write them in ISO form.",
          "Sort, then write JSON Lines: `orient=\"records\"`, `lines=True`, `date_format=\"iso\"`.",
        ],
        task: {
          packages: PDONLY,
          files: { "trips.csv": TRIPS_CSV },
          checks: [
            { kind: "expr", id: "records", label: "Each line is a JSON object with the three fields, in time order", show: "export_trips_jsonl(trips, 'trips.jsonl')", expr: "import json as _json\nimport pandas as _pd\nexport_trips_jsonl(_pd.read_csv('trips.csv').iloc[::-1], '_t.jsonl')\nwith open('_t.jsonl', encoding='utf-8') as _f:\n    _rows = [_json.loads(l) for l in _f.read().splitlines() if l.strip()]\nresult = [len(_rows), _rows[0], _rows[-1]]", expected: pv([14, { trip_id: 16126, pickup_at: "2025-01-15T00:12:47.000", fare_amount: 40.8 }, { trip_id: 16139, pickup_at: "2025-01-15T01:29:27.000", fare_amount: 27.5 }]) },
            { kind: "expr", id: "records-hidden", label: "Works for other trips (times across midnight)", hidden: true, expr: `import json as _json\n${frameSetup([{ trip_id: 2, pickup_at: "2025-01-16 00:00:01", fare_amount: 5, tip_amount: 0 }, { trip_id: 1, pickup_at: "2025-01-15 23:59:59", fare_amount: 7.5, tip_amount: 1 }])}\nexport_trips_jsonl(_df, '_m.jsonl')\nwith open('_m.jsonl', encoding='utf-8') as _f:\n    result = [_json.loads(l) for l in _f.read().splitlines() if l.strip()]`, expected: pv([{ trip_id: 1, pickup_at: "2025-01-15T23:59:59.000", fare_amount: 7.5 }, { trip_id: 2, pickup_at: "2025-01-16T00:00:01.000", fare_amount: 5.0 }]), compare: loose },
          ],
        },
      },
    ],
    concept: [
      {
        id: "q1",
        prompt: "What does this print?",
        program: src`
import pandas as pd

pd.DataFrame({"fare": [7.2, 22.059999]}).to_csv("f.csv", index=False, float_format="%.2f")
with open("f.csv", encoding="utf-8") as f:
    print(f.read().splitlines())
`,
        choices: ["['fare', '7.20', '22.06']", "['fare', '7.2', '22.059999']", "[',fare', '0,7.20', '1,22.06']", "['fare', '7.20', '22.05']"],
        answer: 0,
        why: "`float_format=\"%.2f\"` writes every float with exactly two decimals, rounding 22.059999 to 22.06; `index=False` leaves out the index column.",
      },
      {
        id: "q2",
        prompt: "A common mistake: exporting with the index, then reading it back. What does this print?",
        program: src`
import pandas as pd

summary = pd.DataFrame({"borough": ["Queens"], "trips": [1]})
summary.to_csv("s.csv")
print(pd.read_csv("s.csv").columns.tolist())
`,
        choices: ["['Unnamed: 0', 'borough', 'trips']", "['borough', 'trips']", "['index', 'borough', 'trips']", "['0', 'borough', 'trips']"],
        answer: 0,
        why: "The index was written as a first column with an empty header, which `read_csv` names `Unnamed: 0`.",
      },
      {
        id: "q3",
        prompt: "Which format fits a stream of trip events that another service reads one record at a time?",
        choices: ["JSON Lines", "A single CSV with an index column", "A pretty-printed JSON array", "An Excel workbook"],
        answer: 0,
        why: "JSON Lines puts one complete object on each line, so a reader can process records as they arrive without loading the whole file.",
      },
    ],
    review: [
      "`to_csv(index=False, float_format=\"%.2f\")` writes clean, rounded CSV; a written index comes back as `Unnamed: 0`.",
      "`to_json(orient=\"records\", lines=True, date_format=\"iso\")` writes JSON Lines with ISO timestamps; read it with `lines=True`.",
      "Read every export back and compare it with what you meant to write.",
      "Next (see Reliable Data Pipelines): pipelines that validate their input, can be rerun safely, and resume after a failure.",
    ],
  },
];
