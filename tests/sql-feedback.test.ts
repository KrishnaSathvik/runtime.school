import { beforeAll, describe, expect, it } from "vitest";
import { visibleChecks } from "@/features/rt/checks";
import { changedDataDetail, gradeFeedback, rowCountDetail, valuesDetail } from "@/features/rt/feedback";
import { explainError } from "@/engine/explain";
import { learningDatasets } from "@/data/datasets/learning";
import type { ExecuteResponse } from "@/engine/sql-client";
import { bootWorker } from "./helpers/original";

let send: Awaited<ReturnType<typeof bootWorker>>;
beforeAll(async () => { send = await bootWorker(); });

const SEED = `CREATE TABLE a(status TEXT, n INTEGER);
INSERT INTO a VALUES ('completed', 16928), ('cancelled', 1449), ('no_show', 1039), ('scheduled', 22);`;
const REF = "SELECT status, n, ROUND(100.0 * n / (SELECT SUM(n) FROM a), 2) AS share_pct FROM a ORDER BY n DESC, status";
const valuesLine = (r: ExecuteResponse, ordered: boolean, query: string) =>
  visibleChecks(r, ordered, { query }).find((c) => /^Values match/.test(c.label));

describe("failed-check wording (pass/fail comes only from the grader)", () => {
  it("a correct answer still passes and gets no diagnosis", async () => {
    const r = await send({ seed: SEED, query: REF, answer: REF, ordered: true });
    expect(r.grade.ok).toBe(true);
    expect(valuesLine(r, true, REF)?.state).toBe("pass");
  });

  it("right rows in the wrong order are reported as an order problem", async () => {
    const q = REF.replace("ORDER BY n DESC, status", "ORDER BY status");
    const r = await send({ seed: SEED, query: q, answer: REF, ordered: true });
    expect(r.grade.ok).toBe(false);
    expect(valuesLine(r, true, q)?.detail).toMatch(/^Your rows are right, but not in the requested order/);
  });

  it("missing rounding names the column and rounding, not ORDER BY", async () => {
    const q = REF.replace("ROUND(100.0 * n / (SELECT SUM(n) FROM a), 2)", "100.0 * n / (SELECT SUM(n) FROM a)");
    const r = await send({ seed: SEED, query: q, answer: REF, ordered: true });
    expect(r.grade.ok).toBe(false);
    const detail = valuesLine(r, true, q)?.detail ?? "";
    expect(detail).toMatch(/^`share_pct` differs\. In the row for status 'completed' yours is 87\.087149…/);
    expect(detail).toMatch(/rounding/);
    expect(detail).not.toMatch(/ORDER BY/);
    expect(gradeFeedback(r, true, { query: q })).toBe(detail);
  });

  it("a wrong value that also changes the order is paired by its text key", () => {
    const res: ExecuteResponse = {
      result: { columns: ["category", "settled"], values: [["Home", 102.5], ["Air", 101]] },
      expected: { columns: ["category", "settled"], values: [["Air", 101], ["Home", 100.5]] },
      grade: { ok: false, message: "The rows or their order differ. Check ORDER BY and the direction of sorting." },
    };
    const d = valuesDetail(res, true, { query: "SELECT category, SUM(x) FROM s JOIN r ON r.id = s.id GROUP BY category" });
    expect(d).toMatch(/^`settled` differs\. In the row for category 'Home' yours is 102\.5\. Your values are larger than expected\. Rows may be counted more than once/);
  });

  it("integer division is recognised from whole-number results of a division", async () => {
    const seed = "CREATE TABLE i(acc INTEGER, ok INTEGER); INSERT INTO i VALUES (1,1),(1,0),(2,1),(2,1),(2,0);";
    const ref = "SELECT acc, ROUND(100.0 * SUM(ok) / COUNT(*), 2) AS pct FROM i GROUP BY acc";
    const q = "SELECT acc, ROUND(SUM(ok) / COUNT(*), 2) AS pct FROM i GROUP BY acc";
    const r = await send({ seed, query: q, answer: ref });
    expect(r.grade.ok).toBe(false);
    expect(valuesLine(r, false, q)?.detail).toMatch(/Dividing two whole numbers in SQLite drops the decimals/);
  });

  it("an expected value is quoted only when its row is already visible on the page", () => {
    const res: ExecuteResponse = {
      result: { columns: ["k", "v"], values: [["a", 2]] },
      expected: { columns: ["k", "v"], values: [["a", 1]] },
      grade: { ok: false, message: "The row count is right, but some values differ. Check the calculation, matching keys, or window definition." },
    };
    expect(valuesDetail(res, false, {})).not.toMatch(/expected result shows/);
    expect(valuesDetail(res, false, { visibleExpected: [["a", 1]] })).toMatch(/the expected result shows 1\./);
  });

  it("does not name joins or windows the learner has not used or been taught", () => {
    const res: ExecuteResponse = {
      result: { columns: ["k", "v"], values: [["a", "x"]] },
      expected: { columns: ["k", "v"], values: [["a", "y"]] },
      grade: { ok: false, message: "The row count is right, but some values differ. Check the calculation, matching keys, or window definition." },
    };
    const early = valuesDetail(res, false, { query: "SELECT k, v FROM t", tables: ["t", "u"], taught: () => false }) ?? "";
    expect(early).not.toMatch(/JOIN|window/i);
    expect(valuesDetail(res, false, { query: "SELECT k, ROW_NUMBER() OVER (ORDER BY k) FROM t" })).toMatch(/window definition/);
    expect(rowCountDetail(5, 9, { query: "SELECT k FROM t WHERE k = 'A'", tables: ["t"], taught: () => false })).not.toMatch(/JOIN/i);
    expect(rowCountDetail(0, 9, { query: "SELECT k FROM t WHERE k = 'A'" })).toMatch(/upper and lower case/);
  });
});

describe("changed-data failures", () => {
  const RETAIL = learningDatasets.retail.seed;
  it("a date-only BETWEEN end is explained, not called hardcoding", async () => {
    const q = "SELECT order_id FROM orders WHERE ordered_at BETWEEN '2010-12-01' AND '2010-12-31'";
    const ref = "SELECT order_id FROM orders WHERE ordered_at >= '2010-12-01' AND ordered_at < '2011-01-01'";
    const mutation = "INSERT INTO orders (order_id, invoice_no, customer_id, ordered_at, country, order_type) SELECT 999999, 'X1', customer_id, '2010-12-31 15:00:00', country, order_type FROM orders LIMIT 1;";
    const r = await send({ seed: RETAIL, query: q, answer: ref, mutation });
    expect(r.grade.variationFailed).toBe(true);
    const line = visibleChecks(r, false, { query: q }).find((c) => c.label === "Still correct on different data");
    expect(line?.state).toBe("fail");
    expect(line?.detail).toMatch(/BETWEEN … AND '2010-12-31'/);
    expect(line?.detail).not.toMatch(/hardcod|copied/i);
  });

  it("a prefix-only LIKE is explained", () => {
    const d = changedDataDetail({}, { query: "SELECT * FROM products WHERE description LIKE 'LUNCH BAG%'" });
    expect(d).toMatch(/only matches text that starts with LUNCH BAG/);
    expect(d).not.toMatch(/hardcod|copied/i);
  });

  it("hardcoding is named only with evidence", () => {
    expect(changedDataDetail({}, { query: "SELECT 3 AS n UNION ALL SELECT 4" })).toMatch(/doesn't read the tables/);
    const expected = { columns: ["id"], values: [[11], [12], [13], [14], [15]] };
    expect(changedDataDetail({ expected }, { query: "SELECT id FROM t WHERE id IN (11, 12, 13, 14, 15)" })).toMatch(/copied from the result/);
    const honest = changedDataDetail({ expected }, { query: "SELECT id FROM t WHERE score > 10" });
    expect(honest).not.toMatch(/hardcod|copied/i);
    expect(honest).toMatch(/only happens to work here/);
  });
});

describe("error wording by surface", () => {
  it("comment-only input is not called two statements", () => {
    const e = explainError("Run one SQL statement at a time outside the disposable lab.", "-- just a comment", [], "playground");
    expect(e.title).toBe("The editor has only comments");
    expect(e.technical).toBeUndefined();
  });
  it("the Playground does not talk about exercises or a Run query button", () => {
    const two = explainError("Run one SQL statement at a time outside the disposable lab.", "SELECT 1; SELECT 2;", [], "playground");
    expect(`${two.title} ${two.detail} ${two.next}`).not.toMatch(/exercise/i);
    const empty = explainError("Write a query first, then run it.", "", [], "playground");
    expect(empty.next).toBe("Type a query, then press Run.");
    expect(explainError("Use a read-only SELECT, WITH, or EXPLAIN query here. To change data, use Database Lab.", "INSERT INTO t VALUES(1)", [], "playground").title).toBe("The Playground only reads data");
  });
  it("an unknown table lists only the current dataset and never itself", () => {
    const e = explainError("no such table: customers", "SELECT * FROM customers", ["teams", "games", "players"], "playground");
    expect(e.detail).toMatch(/belongs to another dataset/);
    expect(e.next).toBe("Use one of the tables in this dataset: `teams`, `games`, `players`.");
  });
  it("an unclosed quote is named and no missing control is referenced", () => {
    const e = explainError(`unrecognized token: "'abc FROM games;"`, "SELECT 'abc FROM games;", [], "playground");
    expect(e.title).toBe("A text value is never closed");
    const unknown = explainError("something unusual happened", "SELECT 1");
    expect(unknown.detail).not.toMatch(/Technical details/);
    expect(unknown.detail).toContain("something unusual happened");
  });
  it("a lab script without a final SELECT ran; it is not an error", () => {
    const e = explainError("End your lab script with a SELECT or EXPLAIN query so the result can be inspected.", "CREATE TABLE t(a);", [], "lab");
    expect(e.tone).toBe("info");
    expect(e.title).toBe("The script ran");
  });
});
