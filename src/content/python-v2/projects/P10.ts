/** P10 Flights: three rows. One is missing its minutes and must not ship. */
import { py } from "@/engine/python/values";
import type { PyProject } from "../model";
import { milestone, prints, shows } from "./step";

const FLIGHTS = `flight,status,minutes
F1,ok,40
F2,late,10
F3,ok,
`;

const LOADER = `"""Reads the flight sample. You don't need to change this file."""
import csv


def load_flights(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows.append(row)
    return rows
`;

const VALID = `def accepted(rows):
    """Rows whose status is ok or late and whose minutes are filled in."""
    kept = []
    for row in rows:
        known = row["status"] == "ok" or row["status"] == "late"
        if known and row["minutes"] != "":
            kept.append(row["flight"])
    return kept
`;
const DELAY = `def delay_minutes(row):
    """Zero when the flight is ok. The recorded minutes when it is late."""
    if row["status"] == "late":
        return int(row["minutes"])
    return 0
`;
const MARK = `def write_checkpoint(path, flight):
    """Remember the last flight that was accepted."""
    handle = open(path, "w", encoding="utf-8")
    handle.write(flight + "\\n")
    handle.close()
`;
const RETRY = `def attempts(limit):
    """Try up to limit times. Stop at 3, or at the limit when the limit is smaller."""
    done = 0
    while done < limit:
        done = done + 1
        if done == 3:
            return done
    return done
`;
const METRICS = `def metrics(rows):
    """How many flights were accepted, and how many were not."""
    kept = accepted(rows)
    return len(kept), len(rows) - len(kept)
`;
const SHIP = `def write_ship(path, rows):
    """Write the accepted count and the rejected count."""
    kept, rejected = metrics(rows)
    text = "kept " + str(kept) + "\\nrejected " + str(rejected) + "\\n"
    handle = open(path, "w", encoding="utf-8")
    handle.write(text)
    handle.close()
`;

const stub = (source: string) => source.replace(/    (?!""").+\n/g, "    pass\n");
const b1 = VALID;
const b2 = b1 + "\n" + DELAY;
const b3 = b2 + "\n" + MARK;
const b4 = b3 + "\n" + RETRY;
const b5 = b4 + "\n" + METRICS;
const b6 = b5 + "\n" + SHIP;

const head = (names: string) => `from flights import load_flights\nfrom pipe import ${names}\n\nrows = load_flights("data/flights.csv")\n`;
const main1 = `${head("accepted")}for flight in accepted(rows):\n    print(flight)\n`;
const main2 = `${head("delay_minutes")}print(delay_minutes(rows[0]))\nprint(delay_minutes(rows[1]))\n`;
const main3 = `${head("accepted, write_checkpoint")}kept = accepted(rows)\nwrite_checkpoint("checkpoint.txt", kept[-1])\nprint(open("checkpoint.txt", encoding="utf-8").read().strip())\n`;
const main4 = `${head("attempts")}print(attempts(5))\n`;
const main5 = `${head("metrics")}kept, rejected = metrics(rows)\nprint(kept)\nprint(rejected)\n`;
const main6 = `${head("write_ship")}write_ship("ship.txt", rows)\nprint("ship written")\n`;

const files = { "flights.py": LOADER, "data/flights.csv": FLIGHTS };
const validExpr = `from pipe import accepted
rows = [{"flight": "F1", "status": "ok", "minutes": "40"}, {"flight": "F3", "status": "ok", "minutes": ""}, {"flight": "F4", "status": "held", "minutes": "5"}]
result = accepted(rows)
`;
const delayExpr = `from pipe import delay_minutes
result = (delay_minutes({"status": "ok", "minutes": "40"}), delay_minutes({"status": "late", "minutes": "10"}))
`;
const retryExpr = `from pipe import attempts
result = (attempts(1), attempts(5))
`;
const metricExpr = `from pipe import metrics
rows = [{"flight": "F1", "status": "ok", "minutes": "40"}, {"flight": "F3", "status": "ok", "minutes": ""}]
result = metrics(rows)
`;

export const p10: PyProject = {
  id: "P10",
  slug: "flight-pipeline",
  title: "Resilient Flight Data Pipeline",
  story: "Three flights. F3 has no minutes, so it cannot ship. You'll keep the rows that are complete, turn a late flight into its delay, remember the last flight you kept, retry a step a limited number of times, and write what shipped.",
  files: ["pipe.py", "main.py"],
  provided: { "flights.py": LOADER, "data/flights.csv": FLIGHTS },
  dataset: "D13@starter.1",
  dataFiles: ["flights.csv"],
  milestones: [
    milestone({
      id: "P10.m1",
      title: "Validate",
      brief: "Write `accepted(rows)`. Keep a flight when its status is `ok` or `late` and its minutes are not blank. F1 and F2 pass. F3 does not. It returns the kept flight ids (the `flight` values), in file order. `main.py` prints the kept ids.",
      doneWhen: ["A blank minutes value is rejected", "A status other than ok or late is rejected", "`main.py` prints F1 and F2"],
      starters: { "pipe.py": stub(VALID), "main.py": main1 },
      solution: { "pipe.py": b1, "main.py": main1 },
      hints: ["The status has to be one of the two known words.", "A blank minutes string is not zero. Reject it.", "Collect the flight ids of the rows that pass."],
      wrong: [
        { files: { "pipe.py": b1.replace('row["minutes"] != ""', "True"), "main.py": main1 }, fails: ["kept", "output"], why: "a blank minutes value is kept" },
        { files: { "pipe.py": b1.replace('row["status"] == "ok" or row["status"] == "late"', "True"), "main.py": main1 }, fails: ["kept"], why: "any status is accepted" },
      ],
      checks: [shows("kept", "blank minutes and unknown statuses are rejected", "accepted(rows)", validExpr, py.list(py.str("F1"))), prints("main.py prints F1 and F2", "F1\nF2\n")],
      files,
    }),
    milestone({
      id: "P10.m2",
      title: "Transform",
      brief: "Write `delay_minutes(row)`. An `ok` flight has no delay, so return 0. A `late` flight returns its minutes as a number. `main.py` prints 0 for F1 and 10 for F2.",
      doneWhen: ["An ok flight delays 0 minutes", "A late flight delays its recorded minutes", "`main.py` prints 0 then 10"],
      starters: { "pipe.py": b1 + "\n" + stub(DELAY), "main.py": main2 },
      solution: { "pipe.py": b2, "main.py": main2 },
      hints: ["Look at the status first.", "ok returns zero. Don't return the minutes.", "late returns the minutes as an int."],
      wrong: [
        { files: { "pipe.py": b2.replace('if row["status"] == "late":\n        return int(row["minutes"])\n    return 0', "return int(row[\"minutes\"])"), "main.py": main2 }, fails: ["delay", "output"], why: "an ok flight is given its minutes as a delay" },
        { files: { "pipe.py": b2.replace("return int(row[\"minutes\"])", "return 0"), "main.py": main2 }, fails: ["delay", "output"], why: "a late flight has no delay" },
      ],
      checks: [shows("delay", "ok is 0 and late is the recorded minutes", "delay_minutes(row)", delayExpr, py.tuple(py.int(0), py.int(10))), prints("main.py prints 0 then 10", "0\n10\n")],
      files,
    }),
    milestone({
      id: "P10.m3",
      title: "Checkpoint",
      brief: "Write `write_checkpoint(path, flight)`. It stores that flight id and a newline. `main.py` writes the last accepted flight, F2, and prints it.",
      doneWhen: ["The file contains the id you were given", "`main.py` prints F2"],
      starters: { "pipe.py": b2 + "\n" + stub(MARK), "main.py": main3 },
      solution: { "pipe.py": b3, "main.py": main3 },
      hints: ["Open the path for writing.", "Write the flight id and a newline.", "Close the file. main.py passes the last accepted id."],
      wrong: [
        { files: { "pipe.py": b3.replace('handle.write(flight + "\\n")', 'handle.write("\\n")'), "main.py": main3 }, fails: ["mark", "output"], why: "the id is missing" },
        { files: { "pipe.py": b3, "main.py": main3.replace("kept[-1]", "kept[0]") }, fails: ["output"], why: "the first flight is saved" },
      ],
      checks: [shows("mark", "the checkpoint stores the flight id", "open('checkpoint.txt').read()", "from pipe import write_checkpoint\nwrite_checkpoint('checkpoint.txt', 'F2')\nresult = open('checkpoint.txt', encoding='utf-8').read()\n", py.str("F2\n")), prints("main.py prints F2", "F2\n")],
      files,
    }),
    milestone({
      id: "P10.m4",
      title: "Retry and replay",
      brief: "Write `attempts(limit)`. Count up from 1. Stop when you reach 3, or sooner when the limit is smaller than 3. There is no open-ended loop. `attempts(5)` returns 3. `attempts(1)` returns 1. `main.py` prints 3.",
      doneWhen: ["A limit of 1 tries once", "A larger limit stops at 3", "`main.py` prints 3"],
      starters: { "pipe.py": b3 + "\n" + stub(RETRY), "main.py": main4 },
      solution: { "pipe.py": b4, "main.py": main4 },
      hints: ["Start the count at zero and add one each pass.", "The loop condition is the count staying below the limit.", "Return as soon as the count reaches 3."],
      wrong: [
        { files: { "pipe.py": b4.replace("if done == 3:\n            return done\n", ""), "main.py": main4 }, fails: ["tries", "output"], why: "it runs all the way to the limit" },
        { files: { "pipe.py": b4.replace("while done < limit:", "while done < 3:"), "main.py": main4 }, fails: ["tries"], why: "a limit of 1 is ignored" },
      ],
      checks: [shows("tries", "attempts stops at 3 and also respects a smaller limit", "attempts(limit)", retryExpr, py.tuple(py.int(1), py.int(3))), prints("main.py prints 3", "3\n")],
      files,
    }),
    milestone({
      id: "P10.m5",
      title: "Metrics",
      brief: "Write `metrics(rows)`. Return how many flights `accepted` kept, and how many it did not. The sample is 2 kept and 1 rejected. `main.py` prints those two numbers.",
      doneWhen: ["The kept count uses accepted", "Rejected is the rest", "`main.py` prints 2 then 1"],
      starters: { "pipe.py": b4 + "\n" + stub(METRICS), "main.py": main5 },
      solution: { "pipe.py": b5, "main.py": main5 },
      hints: ["Call accepted. Don't rewrite the rules.", "Rejected is the length of the rows minus the length of the kept ids.", "Return both numbers."],
      wrong: [
        { files: { "pipe.py": b5.replace("len(rows) - len(kept)", "len(rows)"), "main.py": main5 }, fails: ["metrics", "output"], why: "rejected counts every row" },
        { files: { "pipe.py": b5.replace("len(kept), len(rows) - len(kept)", "len(rows), len(kept)"), "main.py": main5 }, fails: ["metrics", "output"], why: "the two numbers are swapped" },
      ],
      checks: [shows("metrics", "metrics returns kept and rejected", "metrics(rows)", metricExpr, py.tuple(py.int(1), py.int(1))), prints("main.py prints 2 then 1", "2\n1\n")],
      files,
    }),
    milestone({
      id: "P10.m6",
      title: "Package",
      brief: "Write `write_ship(path, rows)`. The file has two lines, `kept 2` and `rejected 1`, from `metrics`. Each line ends with a newline, the last one too. `main.py` writes `ship.txt`.",
      doneWhen: ["The file says kept 2", "The file says rejected 1", "`main.py` prints ship written"],
      starters: { "pipe.py": b5 + "\n" + stub(SHIP), "main.py": main6 },
      solution: { "pipe.py": b6, "main.py": main6 },
      hints: ["Call metrics. Don't count the rows a second way.", "Each number is on its own line, with the word kept or rejected.", "Open the path, write the text, and close the file."],
      wrong: [
        { files: { "pipe.py": b6.replace('text = "kept " + str(kept) + "\\nrejected " + str(rejected) + "\\n"', 'text = "kept\\n"'), "main.py": main6 }, fails: ["ship"], why: "the numbers are missing" },
        { files: { "pipe.py": b6.replace('"kept " + str(kept)', '"kept " + str(rejected)'), "main.py": main6 }, fails: ["ship"], why: "the kept line prints the rejected count" },
      ],
      checks: [shows("ship", "ship.txt says kept 2 and rejected 1", "open('ship.txt').read()", "result = open('ship.txt', encoding='utf-8').read()", py.str("kept 2\nrejected 1\n")), prints("main.py writes the package", "ship written\n")],
      files,
    }),
  ],
};
