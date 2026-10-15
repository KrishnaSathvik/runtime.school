import { beforeAll, describe, expect, it } from "vitest";
import { lessonFixture, lessons } from "@/content";
import { learningDatasets } from "@/data/datasets/learning";
import {
  closest,
  explainError,
  explainGrade,
  parseSchema,
  tableRefs,
  teachingSchema,
} from "@/engine/explain";
import { bootWorker, type WorkerResponse } from "./helpers/original";

let send: (d: Record<string, unknown>) => Promise<WorkerResponse>;
beforeAll(async () => {
  send = await bootWorker();
});

const RETAIL = learningDatasets.retail.seed;

/** Runs SQL through the shipped worker and explains the real error it returns. */
async function explainRun(query: string, allowWrites = false) {
  const r = await send({ seed: RETAIL, query, allowWrites });
  expect(r.error, `expected an error for: ${query}`).toBeTruthy();
  return explainError(r.error, query, ["customers", "products", "orders"]);
}

describe("schema parsing", () => {
  it("knows every canonical table and matches SQLite's own PRAGMA table_info", async () => {
    const schema = teachingSchema();
    const owners = new Map<string, number>();
    for (const d of Object.values(learningDatasets)) for (const t of d.metadata.tables) owners.set(t.name, (owners.get(t.name) ?? 0) + 1);
    for (const d of Object.values(learningDatasets)) {
      for (const t of d.metadata.tables) {
        for (const c of t.columns) expect(schema[t.name], `${t.name}.${c.name}`).toContain(c.name);
        if (owners.get(t.name) !== 1 || d.ref.datasetId !== "retail") continue;
        const r = await send({ seed: d.seed, query: `SELECT name FROM pragma_table_info('${t.name}')` });
        expect(schema[t.name], t.name).toEqual(r.result.values.map((v: unknown[]) => v[0]));
      }
    }
  });

  it("ignores table-level constraints", () => {
    expect(parseSchema("CREATE TABLE t(a INT, b TEXT, PRIMARY KEY(a), CHECK(b<>''))")).toEqual({ t: ["a", "b"] });
  });

  it("collects tables, aliases and CTE names", () => {
    const refs = tableRefs("WITH x AS (SELECT 1) SELECT * FROM orders o JOIN customers AS c ON c.id=o.customer_id JOIN x");
    expect(refs.get("o")).toBe("orders");
    expect(refs.get("c")).toBe("customers");
    expect(refs.get("x")).toBe("x");
  });

  it("only suggests close matches", () => {
    expect(closest("custmers", ["customers", "products"])).toBe("customers");
    expect(closest("zzz", ["customers"])).toBeNull();
  });
});

describe("explaining real SQLite errors", () => {
  it("syntax: comma before FROM", async () => {
    const e = await explainRun("SELECT country, region, FROM customers");
    expect(e.title).toBe("SQL syntax error");
    expect(e.next).toMatch(/Remove the comma/);
    expect(e.technical).toMatch(/near "FROM": syntax error/);
  });

  it("syntax: SELECT with no columns (the editor scaffold) is explained", async () => {
    const e = await explainRun("SELECT \nFROM customers;");
    expect(e.detail).toMatch(/no columns/);
    expect(e.next).toMatch(/column_a, column_b/);
    expect(e.next).not.toMatch(/name, city/);
  });

  it("syntax: misspelled keyword", async () => {
    const e = await explainRun("SELECT country FORM customers");
    expect(e.title).toBe("SQL syntax error");
    expect(e.detail).toMatch(/FORM|customers/);
  });

  it("syntax: misspelled SELECT is not treated as a write", async () => {
    const e = await explainRun("SELEC country FROM customers");
    expect(e.title).toBe("SQL syntax error");
    expect(e.detail).toMatch(/SELEC/);
    expect(e.next).toMatch(/SELECT/);
    expect(e.detail + e.next).not.toMatch(/Database Lab/);
  });

  it("incomplete input after FROM", async () => {
    const e = await explainRun("SELECT country\nFROM ");
    expect(e.title).toMatch(/ends too early/);
  });

  it("unclosed parenthesis", async () => {
    const e = await explainRun("SELECT COUNT(country FROM customers");
    expect(e.title).toMatch(/syntax|ends too early/);
  });

  it("missing table with typo suggestion", async () => {
    const e = await explainRun("SELECT country FROM custmers");
    expect(e.title).toBe("There is no table called `custmers`");
    expect(e.next).toBe("Did you mean `customers`?");
  });

  it("missing column with typo suggestion from the queried table", async () => {
    const e = await explainRun("SELECT countr FROM customers");
    expect(e.title).toBe("There is no column called `countr`");
    expect(e.next).toBe("Did you mean `country`?");
  });

  it("unquoted text value is identified as a missing quote", async () => {
    const e = await explainRun("SELECT customer_id FROM customers WHERE region = Europe");
    expect(e.title).toMatch(/read as a column name/);
    expect(e.next).toMatch(/'Europe'/);
  });

  it("column that exists elsewhere but not in the queried table", async () => {
    const e = await explainRun("SELECT list_price FROM customers");
    expect(e.title).toMatch(/isn't in the tables you're reading/);
    expect(e.detail).toMatch(/products/);
  });

  it("undefined alias prefix", async () => {
    const e = await explainRun("SELECT x.country FROM customers c");
    expect(e.title).toBe("`x` isn't a table or alias in this query");
    expect(e.next).toMatch(/`c`/);
  });

  it("alias pointing to the wrong table", async () => {
    const e = await explainRun("SELECT c.list_price FROM customers c JOIN orders o ON o.customer_id=c.customer_id");
    expect(e.title).toBe("`customers` has no column `list_price`");
  });

  it("ambiguous column names both tables", async () => {
    const e = await explainRun("SELECT customer_id FROM customers c JOIN orders o ON o.customer_id=c.customer_id");
    expect(e.title).toMatch(/more than one table/);
    expect(e.detail).toMatch(/`c`/);
    expect(e.detail).toMatch(/`o`/);
  });

  it("aggregate in WHERE → HAVING", async () => {
    const e = await explainRun("SELECT customer_id FROM orders WHERE COUNT(*) > 1 GROUP BY customer_id");
    expect(e.title).toMatch(/aggregate/i);
    expect(e.next).toMatch(/HAVING/);
  });

  it("non-SQLite function", async () => {
    const e = await explainRun("SELECT NOW()");
    expect(e.title).toMatch(/no NOW\(\) function/);
    expect(e.next).toMatch(/datetime\('now'\)/);
  });

  it("write in a read-only exercise", async () => {
    const e = await explainRun("DELETE FROM customers");
    expect(e.title).toBe("This exercise only reads data");
  });

  it("two statements in a read-only exercise", async () => {
    const e = await explainRun("SELECT 1; SELECT 2;");
    expect(e.title).toBe("One query at a time");
  });

  it.each([
    ["UNIQUE", "CREATE TABLE t(a UNIQUE); INSERT INTO t VALUES(1),(1); SELECT * FROM t;"],
    ["NOT NULL", "CREATE TABLE t(a NOT NULL); INSERT INTO t VALUES(NULL); SELECT * FROM t;"],
    ["CHECK", "CREATE TABLE t(a CHECK(a>0)); INSERT INTO t VALUES(-1); SELECT * FROM t;"],
    ["FOREIGN KEY", "CREATE TABLE p(id INTEGER PRIMARY KEY); CREATE TABLE c(p REFERENCES p(id)); INSERT INTO c VALUES(9); SELECT * FROM c;"],
  ])("%s constraint failure", async (kind, sql) => {
    const e = await explainRun(sql, true);
    expect(e.title).toBe(`The ${kind} rule blocked the change`);
  });

  it("table already exists in a lab script", async () => {
    const e = await explainRun("CREATE TABLE customers(x); SELECT 1;", true);
    expect(e.title).toBe("`customers` already exists");
  });

  it("lab script without a final SELECT", async () => {
    const e = await explainRun("CREATE TABLE z(x);", true);
    expect(e.title).toBe("Nothing to show yet");
  });

  it("UNION with mismatched columns", async () => {
    const e = await explainRun("SELECT customer_id, country FROM customers UNION SELECT stock_code FROM products");
    expect(e.title).toMatch(/UNION/);
  });

  it("engine startup timeout asks for Retry, not a page reload", () => {
    const e = explainError("The SQL engine timed out while starting. Press Retry to try again.", "SELECT 1");
    expect(e.title).toBe("SQL is still starting");
    expect(e.next).toBe("Press Retry to start it again.");
  });

  it("unknown errors fall back without inventing a cause", () => {
    const e = explainError("something unusual happened", "SELECT 1");
    expect(e.title).toBe("Your SQL couldn't run");
    expect(e.technical).toBe("something unusual happened");
  });
});

/** Runs a graded check like the app and explains the failed result. */
async function explainCheck(lessonId: number, variant: number, query: string) {
  const l = lessons[lessonId];
  const t = l.tasks[variant];
  const fixture = lessonFixture(l);
  const r = await send({
    seed: fixture.seed, query, answer: t.answer, ordered: t.ordered,
    mutation: fixture.mutation, allowWrites: l.mode === "lab",
    validate: t.validate, required: t.required,
  });
  expect(r.grade?.ok).toBe(false);
  return explainGrade({
    message: r.grade.message, variationFailed: r.grade.variationFailed, query,
    actual: r.result, expected: r.expected, ordered: t.ordered,
  });
}

describe("explaining incorrect output", () => {
  it("SELECT * gives too many columns", async () => {
    const e = await explainCheck(0, 0, "SELECT * FROM customers");
    expect(e.title).toBe("Too many columns");
    expect(e.next).toMatch(/SELECT \*/);
  });

  it("columns in the wrong order", async () => {
    const e = await explainCheck(0, 0, "SELECT country, customer_id FROM customers");
    expect(e.title).toBe("Columns are in a different order");
  });

  it("missing alias names the expected column", async () => {
    const id = lessons.findIndex((l) => / AS /i.test(l.tasks[0].answer) && l.mode !== "lab" && !/^WITH/i.test(l.tasks[0].answer));
    const answer = lessons[id].tasks[0].answer;
    const r = await send({ seed: lessonFixture(lessons[id]).seed, query: answer });
    const renamed = `SELECT ${r.result.columns.map((c: string, i: number) => `"${c}" AS col${i}`).join(", ")} FROM (${answer})`;
    const e = await explainCheck(id, 0, renamed);
    expect(e.title).toBe("Column names don't match");
    expect(e.next).toMatch(/AS/);
  });

  it("duplicate rows from a join are identified", async () => {
    const e = await explainCheck(0, 0, "SELECT c.customer_id, c.country FROM customers c JOIN orders o ON o.customer_id = c.customer_id");
    expect(e.title).toBe("Too many rows");
    expect(e.detail).toMatch(/exact duplicates/);
    expect(e.next).toMatch(/JOIN repeats rows/);
  });

  it("aggregate without GROUP BY → suggests GROUP BY", async () => {
    // lesson 10 "Group into summaries": answer groups by a column.
    const t = lessons[10].tasks[0];
    const r = await send({ seed: lessonFixture(lessons[10]).seed, query: t.answer });
    expect(r.result.values.length).toBeGreaterThan(1);
    const cols = r.result.columns;
    const query = t.answer.replace(/\s+GROUP\s+BY[\s\S]*$/i, "");
    const e = await explainCheck(10, 0, query);
    expect(e.title).toBe("Too few rows");
    expect(e.detail).toMatch(/single summary row/);
    expect(e.next).toMatch(/GROUP BY/);
    expect(cols.length).toBeGreaterThan(0);
  });

  it("hard-coded output explains the changed-data check", async () => {
    const e = explainGrade({
      message: "Your visible result matches, but the changed-data check failed. Derive the answer from the tables instead of hardcoding sample output.",
      variationFailed: true,
      query: "SELECT 'Alice'",
    });
    expect(e.title).toBe("Correct on the sample data, but not on different data");
  });

  it("wrong order on an ordered task", async () => {
    const e = await explainCheck(8, 0, "SELECT * FROM (SELECT stock_code, description, list_price FROM products WHERE is_merchandise = 1 ORDER BY list_price DESC, stock_code LIMIT 10) ORDER BY list_price ASC");
    expect(e.title).toMatch(/out of order/);
  });

  it("rounding-only differences are recognised", () => {
    const e = explainGrade({
      message: "The row count is right, but some values differ. Check the calculation, matching keys, or window definition.",
      query: "SELECT AVG(x) AS a FROM t",
      actual: { columns: ["a"], values: [[2.3333333]] },
      expected: { columns: ["a"], values: [[2.33]] },
    });
    expect(e.title).toMatch(/decimals/);
  });

  it("changed-data plan failures explain the optimization requirement", () => {
    const e = explainGrade({ message: "Create a full index on events (account).", planFailed: true,
      variationFailed: true, query: "SELECT * FROM events" });
    expect(e.title).toBe("Your result is correct, but the performance requirement isn't met");
    expect(e.detail).toMatch(/different sample data/);
  });

  it("required construct missing", () => {
    const e = explainGrade({
      message: "The result matches, but this exercise requires you to use LEFT JOIN in the actual script.",
      query: "SELECT 1",
    });
    expect(e.title).toBe("This exercise needs LEFT JOIN");
  });
});
