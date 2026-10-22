/** P08 Events: four recorded lines. Duplicate e1 should be counted once. */
import { py } from "@/engine/python/values";
import type { PyProject } from "../model";
import { milestone, prints, shows } from "./step";

const EVENTS = `{"id": "e1", "sku": "MUG", "kind": "view"}
{"id": "e2", "sku": "HAT", "kind": "view"}
{"id": "e1", "sku": "MUG", "kind": "view"}
{"id": "e3", "sku": "MUG", "kind": "buy"}
`;

const READ = `def read_events(path):
    """Every JSON line in the file, in order."""
    import json
    rows = []
    handle = open(path, encoding="utf-8")
    for line in handle:
        if line.strip() != "":
            rows.append(json.loads(line))
    handle.close()
    return rows
`;
const COUNT = `def count_kind(rows, sku, kind):
    """How many rows have this sku and this kind, including duplicates."""
    count = 0
    for row in rows:
        if row["sku"] == sku and row["kind"] == kind:
            count = count + 1
    return count
`;
const MARK = `def write_checkpoint(path, event_id):
    """Remember the last event id on its own line."""
    handle = open(path, "w", encoding="utf-8")
    handle.write(event_id + "\\n")
    handle.close()
`;
const UNIQUE = `def unique_count(rows, sku, kind):
    """Count sku and kind, skipping an event id you have already seen."""
    seen = []
    count = 0
    for row in rows:
        if row["id"] in seen:
            continue
        seen.append(row["id"])
        if row["sku"] == sku and row["kind"] == kind:
            count = count + 1
    return count
`;
const REPORT = `def write_report(path, rows):
    """Write the unique view counts for MUG and HAT."""
    text = "MUG " + str(unique_count(rows, "MUG", "view")) + "\\nHAT " + str(unique_count(rows, "HAT", "view")) + "\\n"
    handle = open(path, "w", encoding="utf-8")
    handle.write(text)
    handle.close()
`;

const stub = (source: string) => source.replace(/    (?!""").+\n/g, "    pass\n");
const b1 = READ;
const b2 = b1 + "\n" + COUNT;
const b3 = b2 + "\n" + MARK;
const b4 = b3 + "\n" + UNIQUE;
const b5 = b4 + "\n" + REPORT;

const main1 = `from stream import read_events\nprint(len(read_events("data/events.jsonl")))\n`;
const main2 = `from stream import read_events, count_kind\nrows = read_events("data/events.jsonl")\nprint(count_kind(rows, "MUG", "view"))\n`;
const main3 = `from stream import read_events, write_checkpoint\nrows = read_events("data/events.jsonl")\nwrite_checkpoint("checkpoint.txt", rows[-1]["id"])\nprint(open("checkpoint.txt", encoding="utf-8").read().strip())\n`;
const main4 = `from stream import read_events, unique_count\nrows = read_events("data/events.jsonl")\nprint(unique_count(rows, "MUG", "view"))\n`;
const main5 = `from stream import read_events, write_report\nrows = read_events("data/events.jsonl")\nwrite_report("report.txt", rows)\nprint("report written")\n`;

const countExpr = `from stream import count_kind
rows = [{"sku": "MUG", "kind": "view"}, {"sku": "MUG", "kind": "buy"}, {"sku": "MUG", "kind": "view"}]
result = count_kind(rows, "MUG", "view")
`;
const uniqueExpr = `from stream import unique_count
rows = [{"id": "e1", "sku": "MUG", "kind": "view"}, {"id": "e1", "sku": "MUG", "kind": "view"}, {"id": "e3", "sku": "MUG", "kind": "buy"}]
result = unique_count(rows, "MUG", "view")
`;

export const p08: PyProject = {
  id: "P08",
  slug: "event-stream",
  title: "GitHub Event Streaming Analyzer",
  story: "Four events were saved as lines of JSON. e1 appears twice. You'll read every line, count views even when an id repeats, remember the last id, then count each id only once and write that.",
  files: ["stream.py", "main.py"],
  provided: { "data/events.jsonl": EVENTS },
  dataset: "D11@starter.1",
  dataFiles: ["events.jsonl"],
  milestones: [
    milestone({
      id: "P08.m1",
      title: "JSONL streaming",
      brief: "Write `read_events(path)`. Each non-blank line is one JSON object. Return them in order. The file has 4 events. `main.py` prints 4.",
      doneWhen: ["Blank lines are skipped", "The four events are returned", "`main.py` prints 4"],
      starters: { "stream.py": stub(READ), "main.py": main1 },
      solution: { "stream.py": b1, "main.py": main1 },
      hints: ["Open the file and walk it one line at a time.", "Skip a line that is only whitespace.", "json.loads turns one line into a dictionary."],
      wrong: [
        { files: { "stream.py": b1.replace("rows.append(json.loads(line))", "rows.append(json.loads(line))\n            break"), "main.py": main1 }, fails: ["rows", "output"], why: "only the first event is read" },
        { files: { "stream.py": b1.replace("rows.append(json.loads(line))", "rows.append(line)"), "main.py": main1 }, fails: ["rows"], why: "the line stays text" },
      ],
      checks: [shows("rows", "read_events returns one dictionary per line", "read_events('data/events.jsonl')", "from stream import read_events\nrows = read_events('data/events.jsonl')\nresult = (len(rows), rows[0]['id'], rows[-1]['kind'])\n", py.tuple(py.int(4), py.str("e1"), py.str("buy"))), prints("main.py prints 4", "4\n")],
    }),
    milestone({
      id: "P08.m2",
      title: "Aggregates",
      brief: "Write `count_kind(rows, sku, kind)`. Count every matching row, even when an id repeats. MUG views in the file are 2, because e1 is there twice. `main.py` prints 2.",
      doneWhen: ["Both the sku and the kind have to match", "A repeated id is counted again here", "`main.py` prints 2"],
      starters: { "stream.py": b1 + "\n" + stub(COUNT), "main.py": main2 },
      solution: { "stream.py": b2, "main.py": main2 },
      hints: ["Add one only when the sku and the kind both match.", "Don't look at the id in this function.", "Start the count at zero."],
      wrong: [
        { files: { "stream.py": b2.replace('row["sku"] == sku and ', ""), "main.py": main2 }, fails: ["output"], why: "the sku is ignored" },
        { files: { "stream.py": b2.replace("count = count + 1", "count = 1"), "main.py": main2 }, fails: ["views", "output"], why: "the count never passes 1" },
      ],
      checks: [shows("views", "count_kind counts every matching row", "count_kind(rows, 'MUG', 'view')", countExpr, py.int(2)), prints("main.py prints 2", "2\n")],
    }),
    milestone({
      id: "P08.m3",
      title: "Checkpoints",
      brief: "Write `write_checkpoint(path, event_id)`. It stores that id and a newline. `main.py` writes the last event's id, which is e3, and prints it.",
      doneWhen: ["The file contains the id you were given", "`main.py` prints e3"],
      starters: { "stream.py": b2 + "\n" + stub(MARK), "main.py": main3 },
      solution: { "stream.py": b3, "main.py": main3 },
      hints: ["Open the path for writing.", "Write the id and a newline.", "Close the file."],
      wrong: [
        { files: { "stream.py": b3.replace('handle.write(event_id + "\\n")', 'handle.write("\\n")'), "main.py": main3 }, fails: ["mark", "output"], why: "the id is missing" },
        { files: { "stream.py": b3, "main.py": main3.replace('rows[-1]["id"]', 'rows[0]["id"]') }, fails: ["output"], why: "the first id is saved" },
      ],
      checks: [shows("mark", "the checkpoint file stores the id", "open('checkpoint.txt').read()", "from stream import write_checkpoint\nwrite_checkpoint('checkpoint.txt', 'e3')\nresult = open('checkpoint.txt', encoding='utf-8').read()\n", py.str("e3\n")), prints("main.py prints e3", "e3\n")],
    }),
    milestone({
      id: "P08.m4",
      title: "Duplicate events",
      brief: "Write `unique_count(rows, sku, kind)`. The first time you see an id, count it if the sku and kind match. Skip that id after that. MUG views become 1. `main.py` prints 1.",
      doneWhen: ["The second e1 is skipped", "HAT is not counted as a MUG", "`main.py` prints 1"],
      starters: { "stream.py": b3 + "\n" + stub(UNIQUE), "main.py": main4 },
      solution: { "stream.py": b4, "main.py": main4 },
      hints: ["Keep a list of ids you have already seen.", "If the id is in that list, skip the row before you count it.", "Append the id when you see it the first time, whether or not you count it."],
      wrong: [
        { files: { "stream.py": b4.replace("if row[\"id\"] in seen:\n            continue\n        ", ""), "main.py": main4 }, fails: ["unique", "output"], why: "the repeated id is counted" },
        { files: { "stream.py": b4.replace('seen.append(row["id"])\n        if row["sku"] == sku and row["kind"] == kind:', 'seen.append(row["id"])\n        if row["sku"] == sku:'), "main.py": main4 }, fails: ["unique", "output"], why: "a buy is counted as a view" },
      ],
      checks: [shows("unique", "a repeated id is counted once", "unique_count(rows, 'MUG', 'view')", uniqueExpr, py.int(1)), prints("main.py prints 1", "1\n")],
    }),
    milestone({
      id: "P08.m5",
      title: "Report",
      brief: "Write `write_report(path, rows)`. It writes the unique view counts on two lines: `MUG 1` and `HAT 1`. Each line ends with a newline, the last one too. `main.py` writes `report.txt`.",
      doneWhen: ["MUG views are 1", "HAT views are 1", "`main.py` prints report written"],
      starters: { "stream.py": b4 + "\n" + stub(REPORT), "main.py": main5 },
      solution: { "stream.py": b5, "main.py": main5 },
      hints: ["Call unique_count. Don't count the raw rows again.", "One sku per line.", "Open the path, write both lines, and close the file."],
      wrong: [
        { files: { "stream.py": b5.replace("unique_count(rows, \"MUG\", \"view\")", "count_kind(rows, \"MUG\", \"view\")"), "main.py": main5 }, fails: ["report"], why: "the repeated view is included" },
        { files: { "stream.py": b5.replace('text = "MUG " + str(unique_count(rows, "MUG", "view")) + "\\nHAT " + str(unique_count(rows, "HAT", "view")) + "\\n"', 'text = "done\\n"'), "main.py": main5 }, fails: ["report"], why: "the counts are missing" },
      ],
      checks: [shows("report", "report.txt has the unique view counts", "open('report.txt').read()", "result = open('report.txt', encoding='utf-8').read()", py.str("MUG 1\nHAT 1\n")), prints("main.py writes the report", "report written\n")],
    }),
  ],
};
