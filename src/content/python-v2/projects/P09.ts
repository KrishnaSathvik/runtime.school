/** P09 Trips: three fares. pandas and DuckDB should print the same total. This is one browser run, not a speed ranking. */
import { py } from "@/engine/python/values";
import type { PyProject } from "../model";
import { milestone, prints, shows } from "./step";

const TRIPS = `trip_id,fare
T1,10
T2,4
T3,6
`;

const PARQUET = `def trip_count():
    """Copy the CSV into a Parquet file and return how many trips it has."""
    import duckdb
    duckdb.sql("COPY (SELECT * FROM 'data/trips.csv') TO 'trips.parquet' (FORMAT PARQUET)")
    row = duckdb.sql("SELECT COUNT(*) FROM read_parquet('trips.parquet')").fetchone()
    return int(row[0])
`;
const BATCH = `def fare_total():
    """The fares added up with pandas."""
    import pandas as pd
    frame = pd.read_csv("data/trips.csv")
    return int(frame["fare"].sum())
`;
const BOTH = `def both_totals():
    """The pandas total and the DuckDB total."""
    import duckdb
    import pandas as pd
    frame = pd.read_csv("data/trips.csv")
    pandas_total = int(frame["fare"].sum())
    row = duckdb.sql("SELECT SUM(fare) FROM 'data/trips.csv'").fetchone()
    duck_total = int(row[0])
    return pandas_total, duck_total
`;
const MATCH = `def totals_match():
    """True when the two tools agree. This is one run, not a claim about which is faster."""
    pandas_total, duck_total = both_totals()
    return pandas_total == duck_total
`;
const REPORT = `def write_report(path):
    """Write the shared total when the two tools agree."""
    pandas_total, duck_total = both_totals()
    if pandas_total == duck_total:
        text = "total " + str(pandas_total) + "\\n"
    else:
        text = "differ\\n"
    handle = open(path, "w", encoding="utf-8")
    handle.write(text)
    handle.close()
`;

const stub = (source: string) => source.replace(/    (?!""").+\n/g, "    pass\n");
const b1 = PARQUET;
const b2 = b1 + "\n" + BATCH;
const b3 = b2 + "\n" + BOTH;
const b4 = b3 + "\n" + MATCH;
const b5 = b4 + "\n" + REPORT;

const main1 = `from trips import trip_count\nprint(trip_count())\n`;
const main2 = `from trips import fare_total\nprint(fare_total())\n`;
const main3 = `from trips import both_totals\npandas_total, duck_total = both_totals()\nprint(pandas_total)\nprint(duck_total)\n`;
const main4 = `from trips import totals_match, both_totals\npandas_total, duck_total = both_totals()\nprint(pandas_total)\nprint("match" if totals_match() else "differ")\n`;
const main5 = `from trips import write_report\nwrite_report("report.txt")\nprint("report written")\n`;

const files = { "data/trips.csv": TRIPS };
const duck = ["duckdb"] as const;
const pandas = ["pandas"] as const;
const both = ["pandas", "duckdb"] as const;

export const p09: PyProject = {
  id: "P09",
  slug: "taxi-totals",
  title: "High-Performance Taxi Trip Processor",
  story: "Three trips, with fares 10, 4 and 6. You'll copy them into a Parquet file, add the fares with pandas, add them again with DuckDB, and check that both totals are 20. The check says they agree. It does not say which tool is faster.",
  files: ["trips.py", "main.py"],
  provided: { "data/trips.csv": TRIPS },
  dataset: "D06@starter.1",
  dataFiles: ["trips.csv"],
  milestones: [
    milestone({
      id: "P09.m1",
      title: "Read Parquet",
      brief: "Write `trip_count()`. Copy `data/trips.csv` into `trips.parquet` with DuckDB, read that Parquet file back, and return how many trips it has. `main.py` prints 3.",
      doneWhen: ["The Parquet file is written from the CSV", "The count is read back from the Parquet file", "`main.py` prints 3"],
      starters: { "trips.py": stub(PARQUET), "main.py": main1 },
      solution: { "trips.py": b1, "main.py": main1 },
      hints: ["COPY the CSV select into trips.parquet with FORMAT PARQUET.", "Read it back with read_parquet, not from the CSV.", "fetchone gives you the count. Return it as an int."],
      wrong: [
        { files: { "trips.py": b1.replace("SELECT COUNT(*) FROM read_parquet('trips.parquet')", "SELECT COUNT(*) FROM read_parquet('trips.parquet') WHERE fare > 10"), "main.py": main1 }, fails: ["parquet", "output"], why: "only a fare above 10 is counted" },
        { files: { "trips.py": b1.replace("return int(row[0])", "return 0"), "main.py": main1 }, fails: ["parquet", "output"], why: "the count is fixed at zero" },
      ],
      checks: [shows("parquet", "the Parquet file has 3 trips", "trip_count()", "from trips import trip_count\nresult = trip_count()\n", py.int(3)), prints("main.py prints 3", "3\n")],
      packages: duck,
      files,
    }),
    milestone({
      id: "P09.m2",
      title: "Batch statistics",
      brief: "Write `fare_total()`. Read the CSV with pandas and return the fares added up, as an int. 10 + 4 + 6 is 20. `main.py` prints 20.",
      doneWhen: ["The total is the fare column added up", "`main.py` prints 20"],
      starters: { "trips.py": b1 + "\n" + stub(BATCH), "main.py": main2 },
      solution: { "trips.py": b2, "main.py": main2 },
      hints: ["read_csv opens data/trips.csv.", "Sum the fare column.", "Return that sum as an int."],
      wrong: [
        { files: { "trips.py": b2.replace('int(frame["fare"].sum())', "int(len(frame))"), "main.py": main2 }, fails: ["fares", "output"], why: "it counts trips instead of adding fares" },
        { files: { "trips.py": b2.replace('int(frame["fare"].sum())', "int(frame[\"fare\"].iloc[0])"), "main.py": main2 }, fails: ["fares", "output"], why: "only the first fare is returned" },
      ],
      checks: [shows("fares", "fare_total adds the fare column", "fare_total()", "from trips import fare_total\nresult = fare_total()\n", py.int(20)), prints("main.py prints 20", "20\n")],
      packages: pandas,
      files,
    }),
    milestone({
      id: "P09.m3",
      title: "pandas vs DuckDB",
      brief: "Write `both_totals()`. Return the pandas total and the DuckDB total of the same fare column. `main.py` prints each one. Both are 20.",
      doneWhen: ["pandas reads the CSV", "DuckDB sums the same fare column", "`main.py` prints 20 then 20"],
      starters: { "trips.py": b2 + "\n" + stub(BOTH), "main.py": main3 },
      solution: { "trips.py": b3, "main.py": main3 },
      hints: ["Read the CSV with pandas and sum fare, as you already did.", "Ask DuckDB for SUM(fare) from the same CSV.", "Return both numbers."],
      wrong: [
        { files: { "trips.py": b3.replace("SELECT SUM(fare)", "SELECT COUNT(*)"), "main.py": main3 }, fails: ["both", "output"], why: "DuckDB counts rows" },
        { files: { "trips.py": b3.replace("return pandas_total, duck_total", "return pandas_total, 0"), "main.py": main3 }, fails: ["both", "output"], why: "the DuckDB total is dropped" },
      ],
      checks: [shows("both", "pandas and DuckDB both total 20", "both_totals()", "from trips import both_totals\nresult = both_totals()\n", py.tuple(py.int(20), py.int(20))), prints("main.py prints both totals", "20\n20\n")],
      packages: both,
      files,
    }),
    milestone({
      id: "P09.m4",
      title: "Benchmark",
      brief: "Write `totals_match()`. It is true when the pandas total equals the DuckDB total. This is one run in the browser. It is not a ranking of which tool is faster. `main.py` prints the total and then the word match.",
      doneWhen: ["The two totals are compared", "`main.py` prints 20 and match"],
      starters: { "trips.py": b3 + "\n" + stub(MATCH), "main.py": main4 },
      solution: { "trips.py": b4, "main.py": main4 },
      hints: ["Call both_totals. Don't read the file a third way.", "Compare the two numbers.", "main.py prints match only when that comparison is true."],
      wrong: [
        { files: { "trips.py": b4.replace("return pandas_total == duck_total", "return False"), "main.py": main4 }, fails: ["match", "output"], why: "the totals are reported as different" },
        { files: { "trips.py": b4, "main.py": main4.replace('print("match" if totals_match() else "differ")', 'print("faster")') }, fails: ["output"], why: "the program claims a speed result" },
      ],
      checks: [shows("match", "the two totals agree", "totals_match()", "from trips import totals_match\nresult = totals_match()\n", py.bool(true)), prints("main.py prints 20 and match", "20\nmatch\n")],
      packages: both,
      files,
    }),
    milestone({
      id: "P09.m5",
      title: "Report",
      brief: "Write `write_report(path)`. When the totals agree, the file says `total 20`. When they don't, it says `differ`. The line ends with a newline. `main.py` writes `report.txt`.",
      doneWhen: ["The file says total 20", "`main.py` prints report written"],
      starters: { "trips.py": b4 + "\n" + stub(REPORT), "main.py": main5 },
      solution: { "trips.py": b5, "main.py": main5 },
      hints: ["Use both_totals again.", "Write total and the number only when the two numbers are equal.", "Open the path, write the line, and close the file."],
      wrong: [
        { files: { "trips.py": b5.replace('text = "total " + str(pandas_total) + "\\n"', 'text = "total\\n"'), "main.py": main5 }, fails: ["report"], why: "the number is missing" },
        { files: { "trips.py": b5.replace("if pandas_total == duck_total:", "if False:"), "main.py": main5 }, fails: ["report"], why: "the file says the totals differ" },
      ],
      checks: [shows("report", "report.txt says total 20", "open('report.txt').read()", "result = open('report.txt', encoding='utf-8').read()", py.str("total 20\n")), prints("main.py writes the report", "report written\n")],
      packages: both,
      files,
    }),
  ],
};
