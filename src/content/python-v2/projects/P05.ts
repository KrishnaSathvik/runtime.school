/** P05 Travel: a simulated listing. Nothing here books a real room. */
import { py } from "@/engine/python/values";
import type { PyProject } from "../model";
import { milestone, prints, shows } from "./step";

const LISTINGS = `room,day,open
oak,2024-06-01,yes
oak,2024-06-02,yes
oak,2024-06-03,no
elm,2024-06-01,yes
elm,2024-06-02,yes
`;

const LOADER = `"""Reads the simulated listings. You don't need to change this file."""
import csv


def load_listings(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows.append(row)
    return rows
`;

const MODEL = `def listing(room, day, open_flag):
    """One room on one day."""
    return {"room": room, "day": day, "open": open_flag}
`;
const FREE = `def is_open(rows, room, day):
    """True when that room is listed as open on that day."""
    for row in rows:
        if row["room"] == room and row["day"] == day and row["open"] == "yes":
            return True
    return False
`;
const BOOK = `def can_book(rows, room, days):
    """True only when every requested day is open for that room."""
    for day in days:
        if not is_open(rows, room, day):
            return False
    return True
`;
const SAVE = `def save_booking(path, room, days):
    """Store one row per day in a SQLite file. Simulated: this is not a live booking."""
    import sqlite3
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE IF NOT EXISTS bookings (room TEXT, day TEXT)")
    for day in days:
        con.execute("INSERT INTO bookings (room, day) VALUES (?, ?)", (room, day))
    con.commit()
    con.close()
`;
const SHOW = `def booked_days(path):
    """The days stored in the SQLite file, in date order."""
    import sqlite3
    con = sqlite3.connect(path)
    found = []
    for row in con.execute("SELECT day FROM bookings ORDER BY day"):
        found.append(row[0])
    con.close()
    return found
`;

const stub = (source: string) => source.replace(/    (?!""").+\n/g, "    pass\n");
const b1 = MODEL;
const b2 = b1 + "\n" + FREE;
const b3 = b2 + "\n" + BOOK;
const b4 = b3 + "\n" + SAVE + "\n" + SHOW;
const b5 = b4;

const head = (names: string) => `from stays import load_listings\nfrom desk import ${names}\n\nrows = load_listings("data/listings.csv")\n`;
const main1 = `${head("listing")}item = listing("oak", "2024-06-01", "yes")\nprint(item["room"], item["day"])\n`;
const main2 = `${head("is_open")}print(is_open(rows, "oak", "2024-06-03"))\nprint(is_open(rows, "elm", "2024-06-02"))\n`;
const main3 = `${head("can_book")}print(can_book(rows, "oak", ["2024-06-01", "2024-06-02"]))\nprint(can_book(rows, "oak", ["2024-06-02", "2024-06-03"]))\n`;
const main4 = `${head("can_book, save_booking, booked_days")}days = ["2024-06-01", "2024-06-02"]\nif can_book(rows, "oak", days):\n    save_booking("bookings.db", "oak", days)\nfor day in booked_days("bookings.db"):\n    print(day)\n`;
const main5 = main4;

const files = { "stays.py": LOADER };
const openExpr = `from desk import is_open
rows = [{"room": "oak", "day": "2024-06-01", "open": "yes"}, {"room": "oak", "day": "2024-06-03", "open": "no"}]
result = (is_open(rows, "oak", "2024-06-01"), is_open(rows, "oak", "2024-06-03"), is_open(rows, "elm", "2024-06-01"))
`;
const bookExpr = `from desk import can_book
rows = [{"room": "oak", "day": "2024-06-01", "open": "yes"}, {"room": "oak", "day": "2024-06-02", "open": "no"}]
result = (can_book(rows, "oak", ["2024-06-01"]), can_book(rows, "oak", ["2024-06-01", "2024-06-02"]))
`;
const saveExpr = `from desk import save_booking, booked_days
save_booking("check.db", "elm", ["2024-06-02", "2024-06-01"])
result = booked_days("check.db")
`;

export const p05: PyProject = {
  id: "P05",
  slug: "travel-booking",
  title: "Travel Listing & Booking Simulator",
  story: "Simulated. These five rows are not a live booking site, and saving a stay only writes a SQLite file on this page. You'll describe a listing, check whether a room is open, refuse a stay that includes a closed day, and save the days that are actually free.",
  files: ["desk.py", "main.py"],
  provided: { "stays.py": LOADER, "data/listings.csv": LISTINGS },
  dataset: "D05@starter.1",
  dataFiles: ["listings.csv"],
  milestones: [
    milestone({
      id: "P05.m1",
      title: "Models",
      brief: "A listing is a dictionary with `room`, `day` and `open`. Write `listing(room, day, open_flag)` so it returns that dictionary. `main.py` prints the oak room and its first day.",
      doneWhen: ["The dictionary keeps the room, the day and the flag you passed", "`main.py` prints oak 2024-06-01"],
      starters: { "desk.py": stub(MODEL), "main.py": main1 },
      solution: { "desk.py": b1, "main.py": main1 },
      hints: ["Return a dictionary. Don't print it from the function.", "The keys are room, day and open.", "open_flag is the value, not the word open."],
      wrong: [
        { files: { "desk.py": b1.replace('"day": day', '"day": room'), "main.py": main1 }, fails: ["model", "output"], why: "the day is replaced with the room" },
        { files: { "desk.py": b1.replace('"open": open_flag', '"open": "yes"'), "main.py": main1 }, fails: ["model"], why: "the flag is always yes" },
      ],
      checks: [shows("model", "listing keeps the room, the day and the flag", "listing('elm', '2024-06-02', 'no')", "from desk import listing\nresult = listing('elm', '2024-06-02', 'no')\n", py.dict([[py.str("room"), py.str("elm")], [py.str("day"), py.str("2024-06-02")], [py.str("open"), py.str("no")]])), prints("main.py prints oak 2024-06-01", "oak 2024-06-01\n")],
      files,
    }),
    milestone({
      id: "P05.m2",
      title: "Availability",
      brief: "Write `is_open(rows, room, day)`. It is true only when that room has a row for that day whose `open` value is `yes`. Oak is closed on 2024-06-03. Elm is open on 2024-06-02.",
      doneWhen: ["A closed day is false", "A missing room is false", "`main.py` prints False then True"],
      starters: { "desk.py": b1 + "\n" + stub(FREE), "main.py": main2 },
      solution: { "desk.py": b2, "main.py": main2 },
      hints: ["All three have to match: the room, the day and the word yes.", "Return True as soon as you find that row.", "If the loop ends, return False."],
      wrong: [
        { files: { "desk.py": b2.replace('row["open"] == "yes"', "True"), "main.py": main2 }, fails: ["open", "output"], why: "a closed day counts as open" },
        { files: { "desk.py": b2.replace('row["room"] == room and ', ""), "main.py": main2 }, fails: ["open"], why: "the room is ignored" },
      ],
      checks: [shows("open", "only a yes row for that room and day is open", "is_open(rows, 'oak', '2024-06-01')", openExpr, py.tuple(py.bool(true), py.bool(false), py.bool(false))), prints("main.py prints False then True", "False\nTrue\n")],
      files,
    }),
    milestone({
      id: "P05.m3",
      title: "Reservations",
      brief: "Write `can_book(rows, room, days)`. It is true only when every day in the list is open. Oak can take 1 June and 2 June. Oak cannot take 2 June and 3 June, because 3 June is closed.",
      doneWhen: ["One closed day refuses the whole stay", "A stay of open days is accepted", "`main.py` prints True then False"],
      starters: { "desk.py": b2 + "\n" + stub(BOOK), "main.py": main3 },
      solution: { "desk.py": b3, "main.py": main3 },
      hints: ["Use is_open for each day. Don't rewrite the row check.", "If any day is closed, return False immediately.", "Return True only after every day has been checked."],
      wrong: [
        { files: { "desk.py": b3.replace("if not is_open(rows, room, day):\n            return False\n    return True", "return True"), "main.py": main3 }, fails: ["book", "output"], why: "every stay is accepted" },
        { files: { "desk.py": b3.replace("return True", "return False"), "main.py": main3 }, fails: ["book", "output"], why: "every stay is refused" },
      ],
      checks: [shows("book", "every day must be open", "can_book(rows, 'oak', days)", bookExpr, py.tuple(py.bool(true), py.bool(false))), prints("main.py prints True then False", "True\nFalse\n")],
      files,
    }),
    milestone({
      id: "P05.m4",
      title: "Persistence with SQLite",
      brief: "Simulated. Write `save_booking(path, room, days)` to insert one SQLite row per day, and `booked_days(path)` to read those days back in date order. `main.py` saves oak for 1 June and 2 June only after `can_book` says yes.",
      doneWhen: ["Each day is its own row", "The days come back in date order", "`main.py` prints both dates"],
      starters: { "desk.py": b3 + "\n" + stub(SAVE) + "\n" + stub(SHOW), "main.py": main4 },
      solution: { "desk.py": b4, "main.py": main4 },
      hints: ["Connect to the path, create the bookings table if it is missing, then insert.", "Use a placeholder for the room and the day. Don't paste them into the SQL text.", "When you read, order by the day column."],
      wrong: [
        { files: { "desk.py": b4.replace("for day in days:\n        con.execute(\"INSERT INTO bookings (room, day) VALUES (?, ?)\", (room, day))\n", ""), "main.py": main4 }, fails: ["saved", "output"], why: "nothing is inserted" },
        { files: { "desk.py": b4.replace("ORDER BY day", ""), "main.py": main4 }, fails: ["saved"], why: "the days are not ordered" },
      ],
      checks: [shows("saved", "the SQLite file stores each day", "booked_days('bookings.db')", saveExpr, py.list(py.str("2024-06-01"), py.str("2024-06-02"))), prints("main.py prints the two booked days", "2024-06-01\n2024-06-02\n")],
      files,
    }),
    milestone({
      id: "P05.m5",
      title: "Reports",
      brief: "The report is the same program as the save step: only the days `can_book` accepted, printed one per line from the SQLite file. Running it again on a fresh page prints 2024-06-01 and 2024-06-02.",
      doneWhen: ["Closed days are not in the file", "The printed days are in order", "`main.py` prints 2024-06-01 and 2024-06-02"],
      starters: { "desk.py": b4, "main.py": main3 },
      solution: { "desk.py": b5, "main.py": main5 },
      hints: ["Save only when can_book returns true.", "Print the days booked_days gives you, not the original request when it was refused.", "One day per line."],
      wrong: [
        { files: { "desk.py": b5, "main.py": main5.replace("if can_book(rows, \"oak\", days):\n    save_booking(\"bookings.db\", \"oak\", days)\n", "save_booking(\"bookings.db\", \"oak\", [\"2024-06-03\"])\n") }, fails: ["output"], why: "a closed day is saved" },
        { files: { "desk.py": b5.replace("ORDER BY day", ""), "main.py": main5 }, fails: ["saved"], why: "the report does not sort the days" },
      ],
      checks: [shows("saved", "the SQLite file stores each day", "booked_days('bookings.db')", saveExpr, py.list(py.str("2024-06-01"), py.str("2024-06-02"))), prints("main.py prints the two booked days", "2024-06-01\n2024-06-02\n")],
      files,
    }),
  ],
};
