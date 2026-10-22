/** P06 Complaints: simulated assignments. Nobody is actually emailed. */
import { py } from "@/engine/python/values";
import type { PyProject } from "../model";
import { milestone, prints, shows } from "./step";

const CASES = `case_id,product,state
C1,Mug,new
C2,Hat,new
C3,Cup,closed
`;

const LOADER = `"""Reads the simulated cases. You don't need to change this file."""
import csv


def load_cases(path):
    cases = []
    with open(path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            row["owner"] = ""
            cases.append(row)
    return cases
`;

const FIND = `def find_case(cases, case_id):
    """The case with this id, or None."""
    for case in cases:
        if case["case_id"] == case_id:
            return case
    return None
`;
const ASSIGN = `def assign(cases, case_id, owner):
    """Move a new case to assigned and record the owner. Return False otherwise."""
    case = find_case(cases, case_id)
    if case is None or case["state"] != "new":
        return False
    case["state"] = "assigned"
    case["owner"] = owner
    return True
`;
const CLOSE = `def close_case(cases, case_id, log):
    """Move an assigned case to closed and append an audit line. Return False otherwise."""
    case = find_case(cases, case_id)
    if case is None or case["state"] != "assigned":
        return False
    case["state"] = "closed"
    log.append(case_id + " closed")
    return True
`;
const COUNT = `def count_state(cases, state):
    """How many cases are in this state."""
    count = 0
    for case in cases:
        if case["state"] == state:
            count = count + 1
    return count
`;

const stub = (source: string) => source.replace(/    (?!""").+\n/g, "    pass\n");
const b1 = FIND;
const b2 = b1 + "\n" + ASSIGN;
const b3 = b2 + "\n" + CLOSE;
const b4 = b3;
const b5 = b4 + "\n" + COUNT;

const head = (names: string) => `from intake import load_cases\nfrom board import ${names}\n\ncases = load_cases("data/cases.csv")\n`;
const main1 = `${head("find_case")}item = find_case(cases, "C2")\nprint(item["product"])\n`;
const main2 = `${head("assign")}print(assign(cases, "C1", "ada"))\nprint(assign(cases, "C3", "ada"))\n`;
const main3 = `${head("assign, close_case")}log = []\nassign(cases, "C1", "ada")\nprint(close_case(cases, "C1", log))\nprint(close_case(cases, "C2", log))\nprint(log[0])\n`;
const main4 = main3;
const main5 = `${head("assign, close_case, count_state")}log = []\nassign(cases, "C1", "ada")\nclose_case(cases, "C1", log)\nprint(count_state(cases, "new"))\nprint(count_state(cases, "closed"))\n`;

const files = { "intake.py": LOADER };
const assignExpr = `from board import assign
cases = [{"case_id": "C1", "state": "new", "owner": ""}, {"case_id": "C3", "state": "closed", "owner": ""}]
ok_new = assign(cases, "C1", "ada")
ok_closed = assign(cases, "C3", "ada")
result = (ok_new, cases[0]["state"], cases[0]["owner"], ok_closed)
`;
const closeExpr = `from board import assign, close_case
cases = [{"case_id": "C1", "state": "new", "owner": ""}, {"case_id": "C2", "state": "new", "owner": ""}]
log = []
assign(cases, "C1", "ada")
closed = close_case(cases, "C1", log)
refused = close_case(cases, "C2", log)
result = (closed, refused, log)
`;

export const p06: PyProject = {
  id: "P06",
  slug: "complaint-cases",
  title: "Financial Complaint Case Manager",
  story: "Simulated. These three cases are not real complaints, and assigning one does not notify anyone. A case moves from new, to assigned, to closed. A closed case cannot be assigned, and a case that is still new cannot be closed. Every close writes one audit line.",
  files: ["board.py", "main.py"],
  provided: { "intake.py": LOADER, "data/cases.csv": CASES },
  dataset: "D03@starter.1",
  dataFiles: ["cases.csv"],
  milestones: [
    milestone({
      id: "P06.m1",
      title: "Import",
      brief: "`intake.py` reads `data/cases.csv` and gives every case an empty owner. Write `find_case(cases, case_id)`. It returns that case, or None when the id is missing. `main.py` prints the product on C2.",
      doneWhen: ["C2 is the Hat case", "A missing id returns None", "`main.py` prints Hat"],
      starters: { "board.py": stub(FIND), "main.py": main1 },
      solution: { "board.py": b1, "main.py": main1 },
      hints: ["Walk the cases until the id matches.", "Return the whole case, not just the product.", "If nothing matches, return None."],
      wrong: [
        { files: { "board.py": b1.replace('case["case_id"] == case_id', 'case["product"] == case_id'), "main.py": main1 }, fails: ["found", "output"], why: "it matches the product instead of the id" },
        { files: { "board.py": b1.replace("return None", "return cases[0]"), "main.py": main1 }, fails: ["found"], why: "a missing id returns the first case" },
      ],
      checks: [shows("found", "find_case returns the matching case", "find_case(cases, 'C2')", "from board import find_case\ncases = [{\"case_id\": \"C1\", \"product\": \"Mug\"}, {\"case_id\": \"C2\", \"product\": \"Hat\"}]\nresult = (find_case(cases, \"C2\")[\"product\"], find_case(cases, \"C9\"))\n", py.tuple(py.str("Hat"), py.none)), prints("main.py prints Hat", "Hat\n")],
      files,
    }),
    milestone({
      id: "P06.m2",
      title: "Assign",
      brief: "Write `assign(cases, case_id, owner)`. It works only when the case is `new`: the state becomes `assigned` and the owner is stored. C3 is already closed, so assigning it returns False. `main.py` assigns C1 to ada and then tries C3.",
      doneWhen: ["A new case becomes assigned", "A closed case is left alone", "`main.py` prints True then False"],
      starters: { "board.py": b1 + "\n" + stub(ASSIGN), "main.py": main2 },
      solution: { "board.py": b2, "main.py": main2 },
      hints: ["Find the case first. If it is missing, return False.", "Only a state of new can be assigned.", "Set both the state and the owner, then return True."],
      wrong: [
        { files: { "board.py": b2.replace('case["state"] != "new"', "False"), "main.py": main2 }, fails: ["assign", "output"], why: "a closed case can be assigned" },
        { files: { "board.py": b2.replace('case["owner"] = owner', 'case["owner"] = ""'), "main.py": main2 }, fails: ["assign"], why: "the owner is cleared" },
      ],
      checks: [shows("assign", "only a new case becomes assigned", "assign(cases, 'C1', 'ada')", assignExpr, py.tuple(py.bool(true), py.str("assigned"), py.str("ada"), py.bool(false))), prints("main.py prints True then False", "True\nFalse\n")],
      files,
    }),
    milestone({
      id: "P06.m3",
      title: "State transitions",
      brief: "Write `close_case(cases, case_id, log)`. It works only when the case is `assigned`: the state becomes `closed` and the log gains one line, `C1 closed`. A case that is still new returns False and does not touch the log.",
      doneWhen: ["An assigned case closes", "A new case stays new", "The log gains one line"],
      starters: { "board.py": b2 + "\n" + stub(CLOSE), "main.py": main3 },
      solution: { "board.py": b3, "main.py": main3 },
      hints: ["Find the case. Return False unless its state is assigned.", "Append the audit line only after the state changes.", "The line is the id, a space, and the word closed."],
      wrong: [
        { files: { "board.py": b3.replace('case["state"] != "assigned"', "False"), "main.py": main3 }, fails: ["close", "output"], why: "a new case can be closed" },
        { files: { "board.py": b3.replace('log.append(case_id + " closed")', "log.append(case_id)"), "main.py": main3 }, fails: ["close", "output"], why: "the audit line drops the word closed" },
      ],
      checks: [shows("close", "only an assigned case closes, and the log records it", "close_case(cases, 'C1', log)", closeExpr, py.tuple(py.bool(true), py.bool(false), py.list(py.str("C1 closed")))), prints("main.py closes C1 and refuses C2", "True\nFalse\nC1 closed\n")],
      files,
    }),
    milestone({
      id: "P06.m4",
      title: "Audit log",
      brief: "The audit log is the list `close_case` appends to. Closing C1 writes exactly one line. Trying to close C2, which was never assigned, writes nothing else. `main.py` prints that line.",
      doneWhen: ["The log has one line after one successful close", "A refused close does not add a line", "`main.py` prints C1 closed"],
      starters: { "board.py": b3, "main.py": main2 },
      solution: { "board.py": b4, "main.py": main4 },
      hints: ["Append inside the success path only.", "Don't append when you return False.", "Print the first log line from main.py."],
      wrong: [
        { files: { "board.py": b4.replace('log.append(case_id + " closed")\n    return True', "return True"), "main.py": main4 }, fails: ["close", "output"], why: "a close is not recorded" },
        { files: { "board.py": b4, "main.py": main4.replace("print(log[0])", "print(len(log))") }, fails: ["output"], why: "main prints the count instead of the line" },
      ],
      checks: [shows("close", "only an assigned case closes, and the log records it", "close_case(cases, 'C1', log)", closeExpr, py.tuple(py.bool(true), py.bool(false), py.list(py.str("C1 closed")))), prints("main.py closes C1 and refuses C2", "True\nFalse\nC1 closed\n")],
      files,
    }),
    milestone({
      id: "P06.m5",
      title: "Reports",
      brief: "Write `count_state(cases, state)`. After C1 is assigned and closed, one case is still new (C2) and two are closed (C1 and C3). `main.py` prints those two counts.",
      doneWhen: ["The count matches the state you asked for", "`main.py` prints 1 then 2"],
      starters: { "board.py": b4 + "\n" + stub(COUNT), "main.py": main5 },
      solution: { "board.py": b5, "main.py": main5 },
      hints: ["Start the count at zero.", "Add one when the case state equals the state you were given.", "Print the new count, then the closed count."],
      wrong: [
        { files: { "board.py": b5.replace('case["state"] == state', "True"), "main.py": main5 }, fails: ["count", "output"], why: "every case is counted" },
        { files: { "board.py": b5, "main.py": main5.replace('print(count_state(cases, "closed"))', 'print(count_state(cases, "new"))') }, fails: ["output"], why: "the second line repeats the new count" },
      ],
      checks: [shows("count", "count_state counts one state", "count_state(cases, 'new')", "from board import count_state\ncases = [{\"state\": \"new\"}, {\"state\": \"closed\"}, {\"state\": \"new\"}]\nresult = count_state(cases, \"new\")\n", py.int(2)), prints("main.py prints 1 then 2", "1\n2\n")],
      files,
    }),
  ],
};
