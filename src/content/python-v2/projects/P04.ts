/** P04 Retail quality: five invoices, three of them rejected for a reason you can see. */
import { py } from "@/engine/python/values";
import type { PyProject } from "../model";
import { milestone, prints, shows } from "./step";

const SALES = `invoice,sku,description,quantity,price
A1,MUG,Mug,2,4
A2,HAT,,1,8
A3,CUP,Cup,-1,3
A4,PEN,Pen,1,0
A5,HAT,Hat,3,8
`;

const LOADER = `"""Reads the sales sample. You don't need to change this file."""
import csv


def load_sales(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            rows.append(row)
    return rows
`;

const COUNT = `def count_invoices(rows):
    """How many invoices were read."""
    return len(rows)
`;
const SPLIT = `def split_rows(rows):
    """Kept rows, then the invoice ids that were rejected."""
    kept = []
    rejected = []
    for row in rows:
        blank = row["description"] == ""
        bad_qty = int(row["quantity"]) <= 0
        bad_price = int(row["price"]) <= 0
        if blank or bad_qty or bad_price:
            rejected.append(row["invoice"])
        else:
            kept.append(row)
    return kept, rejected
`;
const TOTAL = `def kept_total(rows):
    """Quantity times price, added up over the rows you pass in."""
    total = 0
    for row in rows:
        total = total + int(row["quantity"]) * int(row["price"])
    return total
`;
const REPORT = `def write_report(path, rows):
    """Write how many rows were kept, how many were rejected, and the kept total."""
    kept, rejected = split_rows(rows)
    text = "kept " + str(len(kept)) + "\\nrejected " + str(len(rejected)) + "\\ntotal " + str(kept_total(kept)) + "\\n"
    handle = open(path, "w", encoding="utf-8")
    handle.write(text)
    handle.close()
`;

const stub = (source: string) => source.replace(/    (?!""").+\n/g, "    pass\n");
const body1 = COUNT;
const body2 = body1 + "\n" + SPLIT;
const body3 = body2 + "\n" + TOTAL;
const body4 = body3 + "\n" + REPORT;
const body5 = body4;

const head = (names: string) => `from sales import load_sales\nfrom quality import ${names}\n\nrows = load_sales("data/sales.csv")\n`;
const main1 = `${head("count_invoices")}print(count_invoices(rows))\n`;
const main2 = `${head("split_rows")}kept, rejected = split_rows(rows)\nprint(len(kept), len(rejected))\n`;
const main3 = `${head("split_rows, kept_total")}kept, rejected = split_rows(rows)\nprint(kept_total(kept))\n`;
const main4 = `${head("write_report")}write_report("quality.txt", rows)\nprint("report written")\n`;
const main5 = `${head("split_rows, kept_total")}kept, rejected = split_rows(rows)\nprint(len(kept))\nprint(len(rejected))\nprint(kept_total(kept))\n`;

const files = { "sales.py": LOADER };
const sample = `from quality import split_rows
rows = [
    {"invoice": "A1", "description": "Mug", "quantity": "2", "price": "4"},
    {"invoice": "A2", "description": "", "quantity": "1", "price": "8"},
    {"invoice": "A3", "description": "Cup", "quantity": "-1", "price": "3"},
    {"invoice": "A4", "description": "Pen", "quantity": "1", "price": "0"},
    {"invoice": "A6", "description": "Zero", "quantity": "0", "price": "5"},
]
kept, rejected = split_rows(rows)
result = (len(kept), rejected)
`;

export const p04: PyProject = {
  id: "P04",
  slug: "retail-quality",
  title: "Retail Data Quality Toolkit",
  story: "A shop exported five invoices. Some rows can't be sold: a blank description, a quantity that isn't positive, or a price that isn't positive. You'll read the file, reject those rows, add up what's left, and print the same three numbers the report file uses.",
  files: ["quality.py", "main.py"],
  provided: { "sales.py": LOADER, "data/sales.csv": SALES },
  dataset: "D02@starter.1",
  dataFiles: ["sales.csv"],
  milestones: [
    milestone({
      id: "P04.m1",
      title: "Ingest CSV",
      brief: "`sales.py` reads `data/sales.csv`. Write `count_invoices(rows)` so `main.py` can print how many invoices that is.",
      doneWhen: ["The count is the number of rows", "`main.py` prints 5"],
      starters: { "quality.py": stub(COUNT), "main.py": main1 },
      solution: { "quality.py": body1, "main.py": main1 },
      hints: ["The rows are already loaded.", "Use the length of the list.", "Print that length."],
      wrong: [
        { files: { "quality.py": body1.replace("return len(rows)", "return len(rows) - 1"), "main.py": main1 }, fails: ["count", "output"], why: "one invoice is dropped" },
        { files: { "quality.py": body1.replace("return len(rows)", "return 1"), "main.py": main1 }, fails: ["count", "output"], why: "the count is fixed at one" },
      ],
      checks: [shows("count", "count_invoices returns the number of rows", "count_invoices(rows)", "from quality import count_invoices\nresult = count_invoices([1, 2])\n", py.int(2)), prints("main.py prints 5", "5\n")],
      files,
    }),
    milestone({
      id: "P04.m2",
      title: "Reject and clean",
      brief: "Write `split_rows(rows)`. It returns the kept rows and a list of rejected invoice ids. Reject a blank description, a quantity of 0 or less, or a price of 0 or less. In the sample, A1 and A5 are kept.",
      doneWhen: ["A1 and A5 are kept", "A2, A3 and A4 are rejected", "`main.py` prints 2 3"],
      starters: { "quality.py": body1 + "\n" + stub(SPLIT), "main.py": main2 },
      solution: { "quality.py": body2, "main.py": main2 },
      hints: ["A row fails if any one of the three rules fails. You don't need all three to fail.", "Rejected values are the invoice ids. Kept values are the rows.", "Return both lists."],
      wrong: [
        { files: { "quality.py": body2.replace('row["description"] == ""', "False"), "main.py": main2 }, fails: ["split", "output"], why: "a blank description is kept" },
        { files: { "quality.py": body2.replace("int(row[\"quantity\"]) <= 0", "int(row[\"quantity\"]) < 0"), "main.py": main2 }, fails: ["split"], why: "a quantity of zero would be kept" },
      ],
      checks: [shows("split", "blank, non-positive quantity and non-positive price are rejected", "split_rows(rows)", sample, py.tuple(py.int(1), py.list(py.str("A2"), py.str("A3"), py.str("A4"), py.str("A6")))), prints("main.py prints 2 3", "2 3\n")],
      files,
    }),
    milestone({
      id: "P04.m3",
      title: "Reconcile",
      brief: "Write `kept_total(rows)`. For each row, add quantity times price. Pass it only the kept rows. A1 is 2 × 4 and A5 is 3 × 8, so the sample total is 32.",
      doneWhen: ["The total uses quantity times price", "Rejected rows are not included", "`main.py` prints 32"],
      starters: { "quality.py": body2 + "\n" + stub(TOTAL), "main.py": main3 },
      solution: { "quality.py": body3, "main.py": main3 },
      hints: ["Convert quantity and price to numbers before you multiply.", "Add that product into a total that starts at zero.", "Call it with the kept rows, not with every row."],
      wrong: [
        { files: { "quality.py": body3.replace("int(row[\"quantity\"]) * int(row[\"price\"])", "int(row[\"price\"])"), "main.py": main3 }, fails: ["total", "output"], why: "quantity is ignored" },
        { files: { "quality.py": body3, "main.py": main3.replace("kept_total(kept)", "kept_total(rows)") }, fails: ["output"], why: "rejected rows are added in" },
      ],
      checks: [shows("total", "kept_total multiplies quantity by price", "kept_total(rows)", "from quality import kept_total\nresult = kept_total([{\"quantity\": \"2\", \"price\": \"4\"}])\n", py.int(8)), prints("main.py prints 32", "32\n")],
      files,
    }),
    milestone({
      id: "P04.m4",
      title: "Report",
      brief: "Write `write_report(path, rows)`. The file has three lines: `kept 2`, `rejected 3` and `total 32`. Each line ends with a newline, the last one too. Use `split_rows` and `kept_total` so the file can't disagree with them.",
      doneWhen: ["The file names the kept count, the rejected count and the total", "`main.py` prints report written"],
      starters: { "quality.py": body3 + "\n" + stub(REPORT), "main.py": main4 },
      solution: { "quality.py": body4, "main.py": main4 },
      hints: ["Split the rows first, then total only the kept list.", "Each fact is on its own line.", "Open the path, write the text, and close the file."],
      wrong: [
        { files: { "quality.py": body4.replace("kept_total(kept)", "kept_total(rows)"), "main.py": main4 }, fails: ["report"], why: "the file totals every row" },
        { files: { "quality.py": body4.replace('text = "kept " + str(len(kept)) + "\\nrejected " + str(len(rejected)) + "\\ntotal " + str(kept_total(kept)) + "\\n"', 'text = "kept\\n"'), "main.py": main4 }, fails: ["report"], why: "the numbers are missing" },
      ],
      checks: [shows("report", "quality.txt has the kept count, the rejected count and the total", "open('quality.txt').read()", "result = open('quality.txt', encoding='utf-8').read()", py.str("kept 2\nrejected 3\ntotal 32\n")), prints("main.py writes the report", "report written\n")],
      files,
    }),
    milestone({
      id: "P04.m5",
      title: "Command-line tool",
      brief: "`main.py` is the command. It prints the kept count, the rejected count and the kept total, on three lines. Running it again prints the same three lines.",
      doneWhen: ["The first line is 2", "The second line is 3", "The third line is 32"],
      starters: { "quality.py": body4, "main.py": main1 },
      solution: { "quality.py": body5, "main.py": main5 },
      hints: ["Split the rows, then print the length of each list.", "Print the kept total on the third line.", "Don't print the rows themselves."],
      wrong: [
        { files: { "quality.py": body5, "main.py": main5.replace("print(len(rejected))", "print(len(kept))") }, fails: ["output"], why: "the rejected count repeats the kept count" },
        { files: { "quality.py": body5, "main.py": main5.replace("print(kept_total(kept))", "print(kept_total(rows))") }, fails: ["output"], why: "the command totals every row" },
      ],
      checks: [shows("split", "blank, non-positive quantity and non-positive price are rejected", "split_rows(rows)", sample, py.tuple(py.int(1), py.list(py.str("A2"), py.str("A3"), py.str("A4"), py.str("A6")))), prints("main.py prints 2, 3 and 32", "2\n3\n32\n")],
      files,
    }),
  ],
};
