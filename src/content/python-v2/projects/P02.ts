/** P02 Movie Discovery: a six-film sample, so every title fits on one screen. */
import { py } from "@/engine/python/values";
import type { PyProject } from "../model";
import { milestone, prints, shows } from "./step";

const FILMS = `title,year,genre,stars
Arrival,2016,science fiction,5
Amelie,2001,comedy,5
Alien,1979,science fiction,4
Babe,1995,comedy,3
Heat,1995,crime,5
Hook,1991,comedy,2
`;

const LOADER = `"""Reads the film sample. You don't need to change this file."""
import csv


def load_films(path):
    films = []
    with open(path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            films.append(row)
    return films
`;

const SEARCH = `def search(films, text):
    """Titles that contain text, ignoring case, sorted A to Z."""
    wanted = text.lower()
    names = []
    for film in films:
        if wanted in film["title"].lower():
            names.append(film["title"])
    return sorted(names)
`;
const GENRE = `def by_genre(films, genre):
    """Titles in this genre, sorted A to Z."""
    titles = []
    for film in films:
        if film["genre"] == genre:
            titles.append(film["title"])
    return sorted(titles)
`;
const AVERAGE = `def star_total(films, genre):
    """The star total and how many films are in the genre."""
    total = 0
    count = 0
    for film in films:
        if film["genre"] == genre:
            total = total + int(film["stars"])
            count = count + 1
    return total, count
`;
const RANK = `def ranking(films):
    """Titles, highest stars first. Equal stars go A to Z."""
    rows = []
    for film in films:
        rows.append((-int(film["stars"]), film["title"]))
    names = []
    for stars, title in sorted(rows):
        names.append(title)
    return names
`;
const REPORT = `def write_report(path, films):
    """One title per line, in ranking order."""
    lines = []
    for title in ranking(films):
        lines.append(title)
    handle = open(path, "w", encoding="utf-8")
    handle.write("\\n".join(lines) + "\\n")
    handle.close()
`;

const stub = (source: string) => source.replace(/    (?!""").+\n/g, "    pass\n").replace(/pass\n    pass\n/g, "pass\n");

const searchBody = SEARCH;
const genreBody = SEARCH + "\n" + GENRE;
const avgBody = genreBody + "\n" + AVERAGE;
const rankBody = avgBody + "\n" + RANK;
const reportBody = rankBody + "\n" + REPORT;

const load = `from films import load_films\nfrom explore import `;
const head = (names: string) => `${load}${names}\n\nfilms = load_films("data/films.csv")\n`;

const main1 = `${head("search")}for name in search(films, "ALI"):\n    print(name)\n`;
const main2 = `${head("search, by_genre")}for name in by_genre(films, "comedy"):\n    print(name)\n`;
const main3 = `${head("search, star_total")}total, count = star_total(films, "comedy")\nprint(total, count)\n`;
const main4 = `${head("search, ranking")}for name in ranking(films)[:3]:\n    print(name)\n`;
const main5 = `${head("search, write_report")}write_report("report.txt", films)\nprint("report written")\n`;

const searchExpr = `from explore import search
films = [{"title": "Heat"}, {"title": "Amelie"}, {"title": "Alien"}]
result = search(films, "A")
`;
const genreExpr = `from explore import by_genre
films = [{"title": "Babe", "genre": "comedy"}, {"title": "Heat", "genre": "crime"}, {"title": "Amelie", "genre": "comedy"}]
result = by_genre(films, "comedy")
`;
const avgExpr = `from explore import star_total
films = [{"genre": "comedy", "stars": "5"}, {"genre": "crime", "stars": "5"}, {"genre": "comedy", "stars": "3"}]
result = star_total(films, "comedy")
`;
const rankExpr = `from explore import ranking
films = [{"title": "Heat", "stars": "5"}, {"title": "Alien", "stars": "4"}, {"title": "Amelie", "stars": "5"}]
result = ranking(films)
`;
const reportExpr = `result = open("report.txt", encoding="utf-8").read()`;
const reportText = "Amelie\nArrival\nHeat\nAlien\nBabe\nHook\n";

const keptSearch = shows("search", "search ignores case and sorts A to Z", "search(films, 'A')", searchExpr, py.list(py.str("Alien"), py.str("Amelie"), py.str("Heat")));
const keptGenre = shows("genre", "by_genre keeps one genre, sorted A to Z", "by_genre(films, 'comedy')", genreExpr, py.list(py.str("Amelie"), py.str("Babe")));
const keptAvg = shows("stars", "star_total adds the stars and counts the films", "star_total(films, 'comedy')", avgExpr, py.tuple(py.int(8), py.int(2)));
const keptRank = shows("rank", "ranking puts higher stars first and breaks ties A to Z", "ranking(films)", rankExpr, py.list(py.str("Amelie"), py.str("Heat"), py.str("Alien")));

const files = { "films.py": LOADER };

export const p02: PyProject = {
  id: "P02",
  slug: "movie-discovery",
  title: "Movie Discovery & Rating Explorer",
  story: "You're helping a small cinema desk. The file in this project is six films, small enough to read in one look. You'll search titles, keep one genre, add up the stars, rank the list and write that ranking to a file.",
  files: ["explore.py", "main.py"],
  provided: { "films.py": LOADER, "data/films.csv": FILMS },
  dataset: "R02@starter.1",
  dataFiles: ["films.csv"],
  milestones: [
    milestone({
      id: "P02.m1",
      title: "Search",
      brief: "Write `search(films, text)`. It returns titles that contain `text`, ignoring case, sorted A to Z. `main.py` searches for ALI.",
      doneWhen: ["ALI matches Alien", "The match ignores case", "`main.py` prints Alien"],
      starters: { "explore.py": stub(SEARCH), "main.py": main1 },
      solution: { "explore.py": searchBody, "main.py": main1 },
      hints: ["Compare lowercase copies of the search text and the title.", "Collect the matching titles in a list.", "Return that list sorted A to Z."],
      wrong: [
        { files: { "explore.py": searchBody.replace('film["title"].lower()', 'film["title"]'), "main.py": main1 }, fails: ["search", "output"], why: "the search is case-sensitive" },
        { files: { "explore.py": searchBody.replace("return sorted(names)", "return names"), "main.py": main1 }, fails: ["search"], why: "matches are not sorted" },
      ],
      checks: [keptSearch, prints("main.py prints Alien", "Alien\n")],
      files,
    }),
    milestone({
      id: "P02.m2",
      title: "Genre filters",
      brief: "Write `by_genre(films, genre)`. It returns titles whose genre is exactly that word, sorted A to Z. `main.py` lists the comedies.",
      doneWhen: ["Only the named genre is kept", "Titles are sorted A to Z", "`main.py` prints Amelie, Babe and Hook"],
      starters: { "explore.py": searchBody + "\n" + stub(GENRE), "main.py": main2 },
      solution: { "explore.py": genreBody, "main.py": main2 },
      hints: ["Keep a film only when its genre is equal to the genre you were given.", "Collect titles, not the whole row.", "Sort the titles before you return them."],
      wrong: [
        { files: { "explore.py": genreBody.replace('film["genre"] == genre', "True"), "main.py": main2 }, fails: ["genre", "output"], why: "every film is kept" },
        { files: { "explore.py": genreBody.replace("return sorted(titles)", "return titles"), "main.py": main2 }, fails: ["genre"], why: "the comedies are not sorted" },
      ],
      checks: [keptSearch, keptGenre, prints("main.py lists the comedies", "Amelie\nBabe\nHook\n")],
      files,
    }),
    milestone({
      id: "P02.m3",
      title: "Rating aggregates",
      brief: "Write `star_total(films, genre)`. It returns two numbers: the stars added up, and how many films are in that genre. Comedy in the sample is 5 + 3 + 2 across 3 films. `main.py` prints those two numbers.",
      doneWhen: ["Stars are added, not averaged yet", "The count is the number of films in the genre", "`main.py` prints 10 3"],
      starters: { "explore.py": genreBody + "\n" + stub(AVERAGE), "main.py": main3 },
      solution: { "explore.py": avgBody, "main.py": main3 },
      hints: ["Start both the total and the count at zero.", "Add the star number only when the genre matches.", "Return both numbers together."],
      wrong: [
        { files: { "explore.py": avgBody.replace("total = total + int(film[\"stars\"])", "total = total + 1"), "main.py": main3 }, fails: ["stars", "output"], why: "it counts films instead of adding stars" },
        { files: { "explore.py": avgBody.replace("count = count + 1", "count = 1"), "main.py": main3 }, fails: ["stars", "output"], why: "the count never grows" },
      ],
      checks: [keptSearch, keptAvg, prints("main.py prints the comedy star total and count", "10 3\n")],
      files,
    }),
    milestone({
      id: "P02.m4",
      title: "Rankings",
      brief: "Write `ranking(films)`. Highest stars come first. When two films share a star count, the title that comes first in the alphabet wins. `main.py` prints the top three.",
      doneWhen: ["A 5-star film comes before a 4-star film", "Amelie comes before Arrival", "`main.py` prints Amelie, Arrival, Heat"],
      starters: { "explore.py": avgBody + "\n" + stub(RANK), "main.py": main4 },
      solution: { "explore.py": rankBody, "main.py": main4 },
      hints: ["Pair a sort key with each title. A smaller key should mean a better rank.", "Negating the star count puts the larger count first when you sort.", "Sort those pairs. The title is the second item."],
      wrong: [
        { files: { "explore.py": rankBody.replace("(-int(film[\"stars\"]), film[\"title\"])", "(int(film[\"stars\"]), film[\"title\"])"), "main.py": main4 }, fails: ["rank", "output"], why: "low stars come first" },
        { files: { "explore.py": rankBody.replace("names.append(title)", "names.append(str(stars))"), "main.py": main4 }, fails: ["rank", "output"], why: "the ranking prints the sort key" },
      ],
      checks: [keptRank, prints("main.py prints the top three", "Amelie\nArrival\nHeat\n")],
      files,
    }),
    milestone({
      id: "P02.m5",
      title: "Report",
      brief: "Write `write_report(path, films)`. It writes every title from `ranking` to that path, one per line. Each line ends with a newline, the last one too. `main.py` writes `report.txt`.",
      doneWhen: ["The file has all six titles", "The order matches the ranking", "`main.py` prints report written"],
      starters: { "explore.py": rankBody + "\n" + stub(REPORT), "main.py": main5 },
      solution: { "explore.py": reportBody, "main.py": main5 },
      hints: ["Call the ranking you already wrote. Don't sort a second way.", "Join the titles with a newline and add a newline at the end.", "Open the path, write the text, and close the file."],
      wrong: [
        { files: { "explore.py": reportBody.replace("for title in ranking(films):", "for title in search(films, \"a\"):"), "main.py": main5 }, fails: ["report"], why: "the file is a search, not the ranking" },
        { files: { "explore.py": reportBody.replace('handle.write("\\n".join(lines) + "\\n")', 'handle.write("done")'), "main.py": main5 }, fails: ["report"], why: "the file is a single word" },
      ],
      checks: [keptRank, shows("report", "report.txt is the ranking, one title per line", "open('report.txt').read()", reportExpr, py.str(reportText)), prints("main.py writes the report", "report written\n")],
      files,
    }),
  ],
};
