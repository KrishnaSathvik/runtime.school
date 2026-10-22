import { openDB, type IDBPDatabase } from "idb";

/**
 * Python Database Lab storage and SQL (T03). The learner's databases are SQLite files kept as bytes in this
 * browser (IndexedDB). SQL runs on them in a worker with sql.js (public/vendor/lab-sql-worker.js); Python runs
 * on the same bytes with the stdlib sqlite3 module (runPython `blobs` in, `collect` out). Either way the result
 * is written back here, so both editors always see one database. Canonical datasets are only ever read.
 */

export type LabColumn = { name: string; type: string; notnull: boolean; default: unknown; pk: number };
export type LabTable = { name: string; sql: string; columns: LabColumn[]; foreignKeys: { column: string; table: string; to: string | null }[]; rows: number | null };
export type LabSchema = { tables: LabTable[]; views: { name: string; sql: string }[]; indexes: { name: string; table: string; sql: string | null }[] };
export type LabCell = string | number | null;
export type LabStatement = { index: number; sql: string; columns: string[]; rows: LabCell[][]; more: boolean; changes: number | null };
export type LabReply = {
  results?: LabStatement[];
  error?: { index: number; message: string } | null;
  rolledBack?: boolean;
  bytes?: ArrayBuffer;
  schema?: LabSchema;
  plan?: { id: number; parent: number; detail: string }[];
};

export const LAB_SQL_TIMEOUT_MS = 10000;
/** SQLite files Python may create and the lab keeps. */
export const LAB_DB_SUFFIXES = [".db", ".sqlite", ".sqlite3"] as const;
export const LAB_DEFAULT_DB = "learning.db";
/** Largest database the lab keeps in this browser. */
export const LAB_MAX_BYTES = 48 * 1024 * 1024;

export const isLabDbName = (name: string) => /^[\w-]{1,40}\.(db|sqlite|sqlite3)$/.test(name);

// ---------------- SQL worker ----------------

let worker: Worker | null = null;
let nextId = 1;

function labWorker(): Worker {
  worker ??= new Worker("/vendor/lab-sql-worker.js");
  return worker;
}

/** Run one lab operation. A statement that runs too long ends the worker; the database is left as it was. */
export function labSql(msg: { op: "script"; bytes: ArrayBuffer | null; sql: string } | { op: "plan"; bytes: ArrayBuffer | null; sql: string } | { op: "browse"; bytes: ArrayBuffer | null; table: string } | { op: "schema"; bytes: ArrayBuffer | null }): Promise<LabReply> {
  const w = labWorker();
  const id = nextId++;
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      w.removeEventListener("message", onMessage);
      w.terminate();
      if (worker === w) worker = null;
      resolve({ error: { index: 0, message: `Stopped after ${LAB_SQL_TIMEOUT_MS / 1000} s. Nothing was saved: the database is as it was before this run.` } });
    }, LAB_SQL_TIMEOUT_MS);
    const onMessage = (e: MessageEvent) => {
      if (e.data?.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener("message", onMessage);
      resolve(e.data as LabReply);
    };
    w.addEventListener("message", onMessage);
    // A copy, so the caller's saved bytes stay intact whatever the worker does.
    w.postMessage({ ...msg, id, bytes: msg.bytes ? msg.bytes.slice(0) : null });
  });
}

// ---------------- storage ----------------

type Stored = { name: string; bytes: ArrayBuffer; updated: number };
let dbp: Promise<IDBPDatabase> | null = null;
const store = () => (dbp ??= openDB("runtime-python-lab", 1, { upgrade: (d) => d.createObjectStore("databases", { keyPath: "name" }) }));

export async function listLabDbs(): Promise<Stored[]> {
  return ((await (await store()).getAll("databases")) as Stored[]).sort((a, b) => a.name.localeCompare(b.name));
}
export async function saveLabDb(name: string, bytes: ArrayBuffer): Promise<void> {
  if (bytes.byteLength > LAB_MAX_BYTES) throw new Error(`${name} is ${Math.round(bytes.byteLength / 1e6)} MB; the lab keeps databases up to ${LAB_MAX_BYTES / 1e6} MB.`);
  await (await store()).put("databases", { name, bytes, updated: Date.now() } satisfies Stored);
}
export async function deleteLabDb(name: string): Promise<void> {
  await (await store()).delete("databases", name);
}

// ---------------- dataset import ----------------

const AFFINITY: Record<string, string> = { integer: "INTEGER", decimal: "REAL", boolean: "INTEGER", text: "TEXT", date: "TEXT", timestamp: "TEXT" };

/**
 * The Python program that copies a dataset edition's clean CSV files (mounted read-only under data/) into a
 * learner database: one table per file, typed from the manifest, with its primary and foreign keys.
 */
export function importProgram(dbName: string, tables: { name: string; primaryKey: string[]; foreignKeys: { column: string; references: string }[]; columns: { name: string; type: string; nullable: boolean }[] }[]): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const ddl = tables.map((t) => {
    const cols = t.columns.map((c) => `    ${q(c.name)} ${AFFINITY[c.type] ?? "TEXT"}${c.nullable ? "" : " NOT NULL"}`);
    if (t.primaryKey.length) cols.push(`    PRIMARY KEY (${t.primaryKey.map(q).join(", ")})`);
    for (const fk of t.foreignKeys) {
      const [rt, rc] = fk.references.split(".");
      cols.push(`    FOREIGN KEY (${q(fk.column)}) REFERENCES ${q(rt)} (${q(rc)})`);
    }
    return `DROP TABLE IF EXISTS ${q(t.name)};\nCREATE TABLE ${q(t.name)} (\n${cols.join(",\n")}\n);`;
  });
  const types = Object.fromEntries(tables.map((t) => [t.name, Object.fromEntries(t.columns.map((c) => [c.name, c.type]))]));
  return `import csv
import sqlite3

SCHEMA = """
${ddl.join("\n\n")}
"""
TYPES = ${JSON.stringify(types)}


def convert(value, kind):
    # An empty CSV field is a missing value.
    if value == "":
        return None
    if kind == "integer":
        return int(value)
    if kind == "decimal":
        return float(value)
    if kind == "boolean":
        return 1 if value.strip().lower() in ("true", "1", "yes") else 0
    return value


conn = sqlite3.connect(${JSON.stringify(dbName)})
conn.executescript(SCHEMA)
for table, kinds in TYPES.items():
    with open(f"data/{table}.csv", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        columns = reader.fieldnames
        marks = ", ".join("?" for _ in columns)
        rows = [tuple(convert(row[c], kinds.get(c, "text")) for c in columns) for row in reader]
    names = ", ".join(f'"{c}"' for c in columns)
    with conn:  # one transaction per table
        conn.executemany(f'INSERT INTO "{table}" ({names}) VALUES ({marks})', rows)
    print(f"{table}: {len(rows):,} rows")
conn.close()
`;
}
