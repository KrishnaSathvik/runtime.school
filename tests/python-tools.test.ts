// The Python tools' content and engines, executed for real: every Comparator pair and Performance Lab
// experiment in Pyodide 314.0.7, and the Database Lab's SQL worker with sql.js on bytes written by Python.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import initSqlJs from "sql.js";
import { describe, expect, it } from "vitest";
import { mountsFor, pyManifests } from "@/content/python-v2/datasets";
import { benchProgram, ownLines, readBench } from "@/engine/python/bench";
import { importProgram, type LabReply } from "@/engine/python/lab-db";
import { mountBytes, runFast } from "./helpers/python-fast";
import { runNode } from "./helpers/python-node";

const LIB_TIMEOUT = 240_000;

// Comparator entries are run in tests/python-compare.test.ts.

describe("Performance Lab experiments", () => {
  // Every experiment is run at its default and smallest inputs in tests/python-performance.test.ts.
  it("reports a mismatch instead of timing different answers", async () => {
    const r = await runFast(benchProgram("numbers = list(range(10))\n", "result = sum(numbers)\n", "result = sum(numbers) + 1\n", 3), { timeoutS: 30 });
    const { report } = readBench(r.status === "ok" ? r.stdout : "");
    expect(report!.same).toBe(false);
    expect(report!.diff).toBe("first difference at result: A has 45, B has 46");
  });

  it("names the first item that differs when both answers have the same size", async () => {
    const r = await runFast(benchProgram("numbers = list(range(5))\n", "result = [n * 2 for n in numbers]\n", "result = [n * 3 for n in numbers]\n", 3), { timeoutS: 30 });
    const { report } = readBench(r.status === "ok" ? r.stdout : "");
    expect(report!.same).toBe(false);
    expect(report!.diff).toBe("first difference at result[1]: A has 2, B has 3");
  });

  it("Try it reports the version's own line numbers, not the hidden setup's", () => {
    const setup = "n = 3\nnumbers = list(range(n))";
    const tb = 'Traceback (most recent call last):\n  File "main.py", line 4, in <module>\n    result = [x for x in numbrs]\nNameError: name \'numbrs\' is not defined\n';
    const r = ownLines({ status: "runtime-error", stdout: "", stderr: "", output: [], durationMs: 1, error: { type: "NameError", message: "name 'numbrs' is not defined", line: 4, traceback: tb, file: null } }, setup, "result = [x for x in numbrs]\n", "b");
    expect(r.status === "runtime-error" && r.error.line).toBe(1);
    expect(r.status === "runtime-error" && r.error.traceback).toContain('File "B", line 1, in <module>');
  });

  it("points at the failing line of an implementation", async () => {
    const r = await runFast(benchProgram("numbers = [1]\n", "result = 1\n", "x = 1\nresult = numbers[5]\n", 3), { timeoutS: 30 });
    const { report } = readBench(r.status === "ok" ? r.stdout : "");
    expect(report!.b.ok).toBe(false);
    expect(report!.b.error).toMatchObject({ type: "IndexError", line: 2 });
  });

  it("reports a syntax error on its own side", async () => {
    const r = await runFast(benchProgram("numbers = [1]\n", "result = (1\n", "result = 1\n", 3), { timeoutS: 30 });
    const { report } = readBench(r.status === "ok" ? r.stdout : "");
    expect(report!.a).toMatchObject({ ok: false, error: { type: "SyntaxError", line: 1 } });
    expect(report!.b.ok).toBe(true);
    expect(report!.same).toBeNull();
  });
});

describe("Database Lab: one database, edited by SQL and by Python", () => {
  const ctx: { labRun?: (SQL: unknown, msg: unknown) => LabReply } = {};
  vm.createContext(ctx);
  vm.runInContext(readFileSync("public/vendor/lab-sql-worker.js", "utf8"), ctx);
  const sql = initSqlJs();
  const lab = async (msg: Record<string, unknown>) => ctx.labRun!(await sql, msg);

  it("Python creates and fills a table; SQL then reads and changes the same file; Python sees the change", async () => {
    const program = `import sqlite3

conn = sqlite3.connect("learning.db")
conn.execute("""
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY,
        name TEXT,
        score INTEGER
    )
""")
conn.execute("INSERT INTO students (name, score) VALUES (?, ?)", ("Maya", 95))
conn.commit()
print(conn.execute("SELECT * FROM students").fetchall())
`;
    const py1 = await runNode(program, { collect: [".db"] });
    expect(py1.status).toBe("ok");
    if (py1.status !== "ok") return;
    expect(py1.stdout).toBe("[(1, 'Maya', 95)]\n");
    const db = py1.blobs!.find((b) => b.path === "learning.db")!.bytes;

    const s = await lab({ op: "script", bytes: db, sql: "UPDATE students SET score = score + 1; INSERT INTO students (name, score) VALUES ('Ali', 80); SELECT name, score FROM students ORDER BY id;" });
    expect(s.error).toBeNull();
    expect(s.results!.map((r) => r.changes)).toEqual([1, 1, null]);
    expect(s.results![2].rows).toEqual([["Maya", 96], ["Ali", 80]]);
    expect(s.schema!.tables[0]).toMatchObject({ name: "students", rows: 2 });

    const py2 = await runNode(`import sqlite3\nprint(sqlite3.connect("learning.db").execute("SELECT name, score FROM students ORDER BY id").fetchall())\n`, { blobs: [{ path: "learning.db", bytes: new Uint8Array(s.bytes!) }], collect: [".db"] });
    expect(py2.status === "ok" && py2.stdout).toBe("[('Maya', 96), ('Ali', 80)]\n");
  });

  it("rolls back a transaction left open, keeps statements before an error, and explains query plans", async () => {
    const made = await lab({ op: "script", bytes: null, sql: "CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT); INSERT INTO t (v) VALUES ('a'), ('b');" });
    const open = await lab({ op: "script", bytes: made.bytes, sql: "BEGIN; DELETE FROM t;" });
    expect(open.rolledBack).toBe(true);
    expect(open.schema!.tables[0].rows).toBe(2);
    const bad = await lab({ op: "script", bytes: made.bytes, sql: "INSERT INTO t (v) VALUES ('c'); SELEC 1; INSERT INTO t (v) VALUES ('d');" });
    expect(bad.error).toMatchObject({ index: 1 });
    expect(bad.schema!.tables[0].rows).toBe(3);
    const plan = await lab({ op: "plan", bytes: made.bytes, sql: "SELECT * FROM t WHERE id = 1;" });
    expect(plan.plan![0].detail).toMatch(/SEARCH t USING INTEGER PRIMARY KEY/);
  });

  it("refuses bytes that aren't a SQLite file", async () => {
    const r = await lab({ op: "schema", bytes: new TextEncoder().encode("not a database at all, just text").buffer });
    expect(r.error?.message).toMatch(/not a SQLite database/);
  });

  it("imports a dataset edition with types and keys from its manifest", async () => {
    const m = pyManifests.R01;
    const tables = Object.entries(m.tables).map(([name, t]) => ({ name, ...t }));
    const mounts = mountsFor("R01@starter.1").map((x) => ({ path: x.path, bytes: mountBytes(x) }));
    const r = await runNode(importProgram("runtime_market.db", tables), { mounts, collect: [".db"] });
    expect(r.status, JSON.stringify(r).slice(0, 800)).toBe("ok");
    if (r.status !== "ok") return;
    expect(r.stdout).toContain("orders: 300 rows");
    const s = await lab({ op: "schema", bytes: r.blobs![0].bytes });
    const orders = s.schema!.tables.find((t) => t.name === "orders")!;
    expect(orders.rows).toBe(300);
    expect(orders.foreignKeys).toEqual([{ column: "customer_id", table: "customers", to: "customer_id" }]);
    expect(orders.columns.find((c) => c.name === "total")!.type).toBe("REAL");
    const q = await lab({ op: "script", bytes: r.blobs![0].bytes, sql: "SELECT typeof(total), COUNT(*) FROM orders GROUP BY 1;" });
    expect(q.results![0].rows).toEqual([["real", 300]]);
  }, LIB_TIMEOUT);
});
