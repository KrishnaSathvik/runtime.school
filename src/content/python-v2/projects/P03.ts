/** P03 Weather: the real NOAA starter file, three cities, January–April 2024. */
import { py } from "@/engine/python/values";
import type { PyProject } from "../model";
import { mountsFor } from "../datasets";
import { milestone, prints, shows } from "./step";

const LOADER = `"""Reads daily weather. You don't need to change this file."""
import csv


def load_weather(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows.append(row)
    return rows
`;

const COUNT = `def count_days(rows):
    """How many observation rows were read."""
    return len(rows)
`;
const MISSING = `def missing_tmax(rows):
    """How many rows left the maximum temperature blank."""
    count = 0
    for row in rows:
        if row["tmax_c"] == "":
            count = count + 1
    return count
`;
const MEAN = `def mean_tenth(rows, station):
    """Mean maximum temperature for one station, in tenths of a degree."""
    total = 0
    count = 0
    for row in rows:
        if row["station_id"] == station and row["tmax_c"] != "":
            total = total + float(row["tmax_c"])
            count = count + 1
    return round(total / count * 10)
`;
const ALERTS = `def alert_days(rows):
    """Dates that reached 32 C or fell to -15 C."""
    found = []
    for row in rows:
        hot = row["tmax_c"] != "" and float(row["tmax_c"]) >= 32
        cold = row["tmin_c"] != "" and float(row["tmin_c"]) <= -15
        if hot or cold:
            found.append(row["observation_date"])
    return found
`;
const REPORT = `def write_report(path, rows):
    """Write how many alert days the file contains."""
    text = "alerts " + str(len(alert_days(rows))) + "\\n"
    handle = open(path, "w", encoding="utf-8")
    handle.write(text)
    handle.close()
`;

const stub = (source: string) => source.replace(/    (?!""").+\n/g, "    pass\n");
const body1 = COUNT;
const body2 = body1 + "\n" + MISSING;
const body3 = body2 + "\n" + MEAN;
const body4 = body3 + "\n" + ALERTS;
const body5 = body4 + "\n" + REPORT;

const head = (names: string) => `from weather import load_weather\nfrom insights import ${names}\n\nrows = load_weather("data/daily_weather.csv")\n`;
const main1 = `${head("count_days")}print(count_days(rows))\n`;
const main2 = `${head("count_days, missing_tmax")}print(missing_tmax(rows))\n`;
const main3 = `${head("mean_tenth")}print(mean_tenth(rows, "USW00003928"))\n`;
const main4 = `${head("alert_days")}print(len(alert_days(rows)))\n`;
const main5 = `${head("write_report")}write_report("alerts.txt", rows)\nprint("report written")\n`;

const mounts = mountsFor("D07@starter.1", ["daily_weather.csv"]);
const files = { "weather.py": LOADER };
const missingExpr = `from insights import missing_tmax
result = missing_tmax([{"tmax_c": ""}, {"tmax_c": "5"}, {"tmax_c": ""}])
`;
const meanExpr = `from insights import mean_tenth
rows = [{"station_id": "S", "tmax_c": "10"}, {"station_id": "S", "tmax_c": ""}, {"station_id": "T", "tmax_c": "30"}]
result = mean_tenth(rows, "S")
`;
const alertExpr = `from insights import alert_days
rows = [
    {"observation_date": "d1", "tmax_c": "32", "tmin_c": "0"},
    {"observation_date": "d2", "tmax_c": "10", "tmin_c": "-15"},
    {"observation_date": "d3", "tmax_c": "", "tmin_c": ""},
]
result = alert_days(rows)
`;

export const p03: PyProject = {
  id: "P03",
  slug: "weather-alerts",
  title: "Weather Insights & Alert Reporter",
  story: "You're reading real daily weather for Wichita, Orlando and Sioux Falls, from January through April 2024. A blank temperature means the station didn't report it. You'll count the days, skip blanks, average Wichita's highs, and flag a day that reaches 32 C or falls to -15 C.",
  files: ["insights.py", "main.py"],
  provided: { "weather.py": LOADER },
  dataset: "D07@starter.1",
  dataFiles: ["daily_weather.csv"],
  milestones: [
    milestone({
      id: "P03.m1",
      title: "Parse observations",
      brief: "`weather.py` already reads `data/daily_weather.csv`. Write `count_days(rows)`, which returns how many rows that is. The starter file has 363 days.",
      doneWhen: ["The count is the number of rows", "`main.py` prints 363"],
      starters: { "insights.py": stub(COUNT), "main.py": main1 },
      solution: { "insights.py": body1, "main.py": main1 },
      hints: ["You already have the rows. You don't need to open the file again.", "The count is the length of that list.", "Print that number from main.py."],
      wrong: [
        { files: { "insights.py": body1.replace("return len(rows)", "return len(rows) - 1"), "main.py": main1 }, fails: ["count", "output"], why: "one day is dropped" },
        { files: { "insights.py": body1.replace("return len(rows)", "return 0"), "main.py": main1 }, fails: ["count", "output"], why: "the count is always zero" },
      ],
      checks: [shows("count", "count_days returns how many rows were read", "count_days(rows)", "from insights import count_days\nresult = count_days([{'a': 1}, {'a': 2}])\n", py.int(2)), prints("main.py prints 363", "363\n")],
      mounts, files,
    }),
    milestone({
      id: "P03.m2",
      title: "Missing values",
      brief: "A blank `tmax_c` is missing, not zero. Write `missing_tmax(rows)`, which counts those blanks. This starter file happens to have none. The check also tries a list that does have blanks.",
      doneWhen: ["A blank maximum is counted", "A reported maximum is not", "`main.py` prints 0"],
      starters: { "insights.py": body1 + "\n" + stub(MISSING), "main.py": main2 },
      solution: { "insights.py": body2, "main.py": main2 },
      hints: ["Look at the text in tmax_c, not at a number you converted.", "An empty string is the blank.", "Add one for each blank row."],
      wrong: [
        { files: { "insights.py": body2.replace('row["tmax_c"] == ""', 'row["tmax_c"] == "0"'), "main.py": main2 }, fails: ["missing", "output"], why: "it looks for zero instead of a blank" },
        { files: { "insights.py": body2.replace("count = count + 1", "count = count + 0"), "main.py": main2 }, fails: ["missing"], why: "blanks are seen and then ignored" },
      ],
      checks: [shows("missing", "blank maximum temperatures are counted", "missing_tmax(rows)", missingExpr, py.int(2)), prints("main.py prints 0 missing highs", "0\n")],
      mounts, files,
    }),
    milestone({
      id: "P03.m3",
      title: "Summaries",
      brief: "Write `mean_tenth(rows, station)`. A row's station is in `station_id`. Skip blank highs. Return the mean maximum for that station, multiplied by 10 and rounded. Wichita is station USW00003928, and its mean high over this file is 14.6 C, so the function returns 146.",
      doneWhen: ["Blank highs are skipped", "Other stations are skipped", "`main.py` prints 146"],
      starters: { "insights.py": body2 + "\n" + stub(MEAN), "main.py": main3 },
      solution: { "insights.py": body3, "main.py": main3 },
      hints: ["Keep a running total and a count, and skip a row whose maximum is blank.", "Also skip a row from a different station.", "Return round(total / count * 10)."],
      wrong: [
        { files: { "insights.py": body3.replace('and row["tmax_c"] != ""', ""), "main.py": main3 }, fails: ["mean"], why: "a blank high is treated as a number" },
        { files: { "insights.py": body3.replace("round(total / count * 10)", "round(total / count)"), "main.py": main3 }, fails: ["mean", "output"], why: "the result is whole degrees, not tenths" },
      ],
      checks: [shows("mean", "the mean skips blanks and other stations", "mean_tenth(rows, 'S')", meanExpr, py.int(100)), prints("main.py prints Wichita's mean in tenths", "146\n")],
      mounts, files,
    }),
    milestone({
      id: "P03.m4",
      title: "Threshold alerts",
      brief: "Write `alert_days(rows)`. A day is an alert when the high (`tmax_c`) is 32 C or more, or the low (`tmin_c`) is -15 C or less. Skip a side that was left blank. It returns the list of the alert days' `observation_date` values, in file order. `main.py` prints how many alert days are in the file: 22.",
      doneWhen: ["32 C is an alert", "-15 C is an alert", "`main.py` prints 22"],
      starters: { "insights.py": body3 + "\n" + stub(ALERTS), "main.py": main4 },
      solution: { "insights.py": body4, "main.py": main4 },
      hints: ["A blank temperature is not a number. Don't convert it.", "Hot is a reported high of 32 or more. Cold is a reported low of -15 or less.", "Collect the dates, then let main.py print how many there are."],
      wrong: [
        { files: { "insights.py": body4.replace("float(row[\"tmax_c\"]) >= 32", "float(row[\"tmax_c\"]) > 32"), "main.py": main4 }, fails: ["alerts"], why: "a high of exactly 32 is missed" },
        { files: { "insights.py": body4.replace("float(row[\"tmin_c\"]) <= -15", "float(row[\"tmin_c\"]) < -15"), "main.py": main4 }, fails: ["alerts"], why: "a low of exactly -15 is missed" },
      ],
      checks: [shows("alerts", "32 C and -15 C are alerts, blanks are not", "alert_days(rows)", alertExpr, py.list(py.str("d1"), py.str("d2"))), prints("main.py prints 22 alert days", "22\n")],
      mounts, files,
    }),
    milestone({
      id: "P03.m5",
      title: "Report",
      brief: "Write `write_report(path, rows)`. It writes one line, `alerts 22`, ending with a newline, using the alert count you already compute. `main.py` writes `alerts.txt`.",
      doneWhen: ["The file says alerts 22", "`main.py` prints report written"],
      starters: { "insights.py": body4 + "\n" + stub(REPORT), "main.py": main5 },
      solution: { "insights.py": body5, "main.py": main5 },
      hints: ["Use the alert list you already wrote. Don't invent a second rule.", "The line is the word alerts, a space, and the count.", "Open the path, write the line, and close the file."],
      wrong: [
        { files: { "insights.py": body5.replace('text = "alerts " + str(len(alert_days(rows))) + "\\n"', 'text = "alerts\\n"'), "main.py": main5 }, fails: ["report"], why: "the count is missing" },
        { files: { "insights.py": body5.replace("len(alert_days(rows))", "len(rows)"), "main.py": main5 }, fails: ["report"], why: "every day is called an alert" },
      ],
      checks: [shows("report", "alerts.txt says alerts 22", "open('alerts.txt').read()", "result = open('alerts.txt', encoding='utf-8').read()", py.str("alerts 22\n")), prints("main.py writes the report", "report written\n")],
      mounts, files,
    }),
  ],
};
