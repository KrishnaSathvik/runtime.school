/** P07 Papers: pages were recorded. The program never calls the internet. */
import { py } from "@/engine/python/values";
import type { PyProject } from "../model";
import { milestone, prints, shows } from "./step";

const PAGES = `{
  "1": [{"title": "Hat Fibre", "year": 2019}, {"title": "Mugs of Rome", "year": 2020}],
  "2": [{"title": "Cup Glaze", "year": 2021}],
  "3": []
}
`;

const PAGE = `def load_page(path, number):
    """The recorded page, or an empty list when that page was not saved."""
    import json
    handle = open(path, encoding="utf-8")
    book = json.load(handle)
    handle.close()
    return book.get(str(number), [])
`;
const WALK = `def collect(path):
    """Titles from page 1 onward, stopping at the first empty page."""
    papers = []
    number = 1
    while number < 10:
        rows = load_page(path, number)
        if len(rows) == 0:
            break
        for row in rows:
            papers.append(row["title"])
        number = number + 1
    return papers
`;
const CACHE = `def cached_page(path, number, cache):
    """Return the page, reading the file only the first time for that number."""
    key = str(number)
    if key in cache:
        return cache[key]
    rows = load_page(path, number)
    cache[key] = rows
    return rows
`;
const STORE = `def save_titles(path, titles):
    """Store each title in a SQLite file. The pages themselves stay on disk."""
    import sqlite3
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE IF NOT EXISTS papers (title TEXT)")
    for title in titles:
        con.execute("INSERT INTO papers (title) VALUES (?)", (title,))
    con.commit()
    con.close()


def title_count(path):
    """How many titles are stored."""
    import sqlite3
    con = sqlite3.connect(path)
    count = con.execute("SELECT COUNT(*) FROM papers").fetchone()[0]
    con.close()
    return count
`;

const stub = (source: string) => source.replace(/    (?!""").+\n/g, "    pass\n");
const b1 = PAGE;
const b2 = b1 + "\n" + WALK;
const b3 = b2 + "\n" + CACHE;
const b4 = b3 + "\n" + STORE;
const b5 = b4;

const main1 = `from client import load_page\nprint(len(load_page("data/pages.json", 1)))\n`;
const main2 = `from client import collect\nfor title in collect("data/pages.json"):\n    print(title)\n`;
const main3 = `from client import cached_page\ncache = {}\ncached_page("data/pages.json", 1, cache)\ncached_page("data/pages.json", 1, cache)\nprint(len(cache))\n`;
const main4 = `from client import collect, save_titles, title_count\ntitles = collect("data/pages.json")\nsave_titles("papers.db", titles)\nprint(title_count("papers.db"))\n`;
const main5 = `from client import collect\ntitles = collect("data/pages.json")\nprint(len(titles))\nfor title in sorted(titles):\n    print(title)\n`;

const pageExpr = `from client import load_page
result = (len(load_page("data/pages.json", 1)), len(load_page("data/pages.json", 3)), len(load_page("data/pages.json", 9)))
`;
const walkExpr = `from client import collect
result = collect("data/pages.json")
`;
const cacheExpr = `from client import cached_page
cache = {}
first = cached_page("data/pages.json", 2, cache)
second = cached_page("data/pages.json", 2, cache)
result = (len(cache), first is second)
`;
const storeExpr = `from client import save_titles, title_count
save_titles("check.db", ["Hat Fibre"])
result = title_count("check.db")
`;

export const p07: PyProject = {
  id: "P07",
  slug: "paper-pages",
  title: "Research Publications API Explorer",
  story: "The pages were recorded ahead of time in data/pages.json. Nothing in this project calls the internet. Page 3 is empty, which means stop. You'll read one page, walk until the empty page, remember a page you already read, store the titles in SQLite, and print them in alphabetical order.",
  files: ["client.py", "main.py"],
  provided: { "data/pages.json": PAGES },
  dataset: "D10@starter.1",
  dataFiles: ["pages.json"],
  milestones: [
    milestone({
      id: "P07.m1",
      title: "API client",
      brief: "Write `load_page(path, number)`. It reads the recorded JSON and returns that page's list. A page number that was not recorded returns an empty list. Page 1 has two papers. `main.py` prints 2.",
      doneWhen: ["Page 1 has two papers", "A missing page is an empty list", "`main.py` prints 2"],
      starters: { "client.py": stub(PAGE), "main.py": main1 },
      solution: { "client.py": b1, "main.py": main1 },
      hints: ["Open the JSON file and load it.", "Page numbers in the file are text, so look up str(number).", "When the number is missing, return an empty list rather than failing."],
      wrong: [
        { files: { "client.py": b1.replace("book.get(str(number), [])", "book.get(str(number))"), "main.py": main1 }, fails: ["page"], why: "a missing page returns None" },
        { files: { "client.py": b1.replace("str(number)", "number"), "main.py": main1 }, fails: ["page", "output"], why: "the page number is looked up as a number" },
      ],
      checks: [shows("page", "page 1 has two papers and a missing page is empty", "load_page(path, 1)", pageExpr, py.tuple(py.int(2), py.int(0), py.int(0))), prints("main.py prints 2", "2\n")],
    }),
    milestone({
      id: "P07.m2",
      title: "Pagination",
      brief: "Write `collect(path)`. Start at page 1. Append every title. Stop when a page is empty. Don't read past that. The recorded file yields three titles. `main.py` prints them in the order the pages list them.",
      doneWhen: ["Empty page 3 stops the walk", "All three titles are collected", "`main.py` prints Hat Fibre, Mugs of Rome, Cup Glaze"],
      starters: { "client.py": b1 + "\n" + stub(WALK), "main.py": main2 },
      solution: { "client.py": b2, "main.py": main2 },
      hints: ["Call load_page. Don't open the file a second way.", "An empty list means stop, before you add anything from it.", "Keep the titles, not the year."],
      wrong: [
        { files: { "client.py": b2.replace("while number < 10:", "while number < 2:"), "main.py": main2 }, fails: ["walk", "output"], why: "page 2 is never read" },
        { files: { "client.py": b2.replace('papers.append(row["title"])', 'papers.append(str(row["year"]))'), "main.py": main2 }, fails: ["walk", "output"], why: "years are collected instead of titles" },
      ],
      checks: [shows("walk", "collect stops at the empty page and keeps the titles", "collect(path)", walkExpr, py.list(py.str("Hat Fibre"), py.str("Mugs of Rome"), py.str("Cup Glaze"))), prints("main.py prints the three titles", "Hat Fibre\nMugs of Rome\nCup Glaze\n")],
    }),
    milestone({
      id: "P07.m3",
      title: "Retries and caching",
      brief: "There is no network to retry. Write `cached_page(path, number, cache)` so the file is read the first time you ask for a page, and the same list is returned the second time. `main.py` asks for page 1 twice and prints how many pages are in the cache: 1.",
      doneWhen: ["The second call does not grow the cache", "The same list comes back", "`main.py` prints 1"],
      starters: { "client.py": b2 + "\n" + stub(CACHE), "main.py": main3 },
      solution: { "client.py": b3, "main.py": main3 },
      hints: ["Use the page number as text for the cache key.", "If the key is already there, return that list.", "Otherwise load the page, store it, and return it."],
      wrong: [
        { files: { "client.py": b3.replace("if key in cache:\n        return cache[key]\n    ", ""), "main.py": main3 }, fails: ["cache"], why: "the page is stored again" },
        { files: { "client.py": b3.replace("cache[key] = rows\n    return rows", "return rows"), "main.py": main3 }, fails: ["cache", "output"], why: "nothing is stored" },
      ],
      checks: [shows("cache", "the second read of a page comes from the cache", "cached_page(path, 2, cache)", cacheExpr, py.tuple(py.int(1), py.bool(true))), prints("main.py prints 1", "1\n")],
    }),
    milestone({
      id: "P07.m4",
      title: "SQLite store",
      brief: "Write `save_titles(path, titles)` and `title_count(path)`. Each title is one row. `main.py` stores the three collected titles and prints 3.",
      doneWhen: ["Each title is a row", "`main.py` prints 3"],
      starters: { "client.py": b3 + "\n" + stub(STORE), "main.py": main4 },
      solution: { "client.py": b4, "main.py": main4 },
      hints: ["Create the papers table if it is missing, then insert one title at a time.", "Use a placeholder in the INSERT.", "title_count reads COUNT(*) back from that table."],
      wrong: [
        { files: { "client.py": b4.replace("for title in titles:\n        con.execute(\"INSERT INTO papers (title) VALUES (?)\", (title,))\n    ", ""), "main.py": main4 }, fails: ["stored", "output"], why: "no titles are inserted" },
        { files: { "client.py": b4.replace("SELECT COUNT(*) FROM papers", "SELECT COUNT(*) FROM papers WHERE title = 'Hat Fibre'"), "main.py": main4 }, fails: ["output"], why: "only one title is counted" },
      ],
      checks: [shows("stored", "one title is one row", "title_count('papers.db')", storeExpr, py.int(1)), prints("main.py prints 3", "3\n")],
    }),
    milestone({
      id: "P07.m5",
      title: "Summaries",
      brief: "Print how many titles `collect` returned, then the titles in alphabetical order. The recorded pages produce 3, then Cup Glaze, Hat Fibre, Mugs of Rome.",
      doneWhen: ["The count is 3", "The titles are sorted A to Z"],
      starters: { "client.py": b4, "main.py": main2 },
      solution: { "client.py": b5, "main.py": main5 },
      hints: ["Print the length of the collected list first.", "Sort the titles before you print them. Don't sort the pages.", "One title per line."],
      wrong: [
        { files: { "client.py": b5, "main.py": main5.replace("for title in sorted(titles):", "for title in titles:") }, fails: ["output"], why: "the titles stay in page order" },
        { files: { "client.py": b5, "main.py": main5.replace("print(len(titles))", "print(len(titles) - 1)") }, fails: ["output"], why: "the count is short by one" },
      ],
      checks: [shows("walk", "collect stops at the empty page and keeps the titles", "collect(path)", walkExpr, py.list(py.str("Hat Fibre"), py.str("Mugs of Rome"), py.str("Cup Glaze"))), prints("main.py prints 3 and the sorted titles", "3\nCup Glaze\nHat Fibre\nMugs of Rome\n")],
    }),
  ],
};
