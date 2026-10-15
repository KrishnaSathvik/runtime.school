/** Node helpers for executing content against the built canonical SQLite datasets. */
import fs from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { createRequire } from "node:module";
import { databaseOf, seedOverlay } from "@/engine/sql-client";

const ROOT = path.resolve(__dirname, "../..");
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Db = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let SQL: any = null;
const bytesCache = new Map<string, Uint8Array>();

export async function sqlEngine() {
  if (!SQL) {
    const init = require(path.join(ROOT, "public/vendor/sql-wasm.js"));
    SQL = await init({ locateFile: (f: string) => path.join(ROOT, "public/vendor", f) });
  }
  return SQL;
}

export function databaseBytes(url: string): Uint8Array {
  let bytes = bytesCache.get(url);
  if (!bytes) {
    const file = path.join(ROOT, "public", url);
    if (!fs.existsSync(file)) throw new Error(`Missing ${url}. Run npm run datasets:build first.`);
    bytes = new Uint8Array(gunzipSync(fs.readFileSync(file)));
    bytesCache.set(url, bytes);
  }
  return bytes;
}

/** Opens a seed: a canonical database named by its directive line plus the overlay, or plain seed SQL. */
export async function openSeed(seed: string): Promise<Db> {
  const S = await sqlEngine();
  const ref = databaseOf(seed);
  const db = ref ? new S.Database(databaseBytes(ref.url)) : new S.Database();
  const overlay = ref ? seedOverlay(seed) : seed;
  if (overlay.trim()) db.exec(overlay);
  return db;
}

/** Last result table of a script. */
export function lastResult(db: Db, sql: string): { columns: string[]; values: unknown[][] } {
  const res = db.exec(sql);
  const last = res[res.length - 1];
  return last ? { columns: last.columns, values: last.values } : { columns: [], values: [] };
}

/** Runs fn with the changed-data fixture applied, then restores the database. */
export function withMutation<T>(db: Db, mutation: string, fn: () => T): T {
  db.exec("PRAGMA foreign_keys=OFF; SAVEPOINT check_changed;");
  try {
    db.exec(mutation);
    return fn();
  } finally {
    db.exec("ROLLBACK TO check_changed; RELEASE check_changed; PRAGMA foreign_keys=ON;");
  }
}

export const sameResult = (a: { values: unknown[][] }, b: { values: unknown[][] }) => {
  const key = (r: { values: unknown[][] }) => r.values.map(v => JSON.stringify(v)).sort().join("\n");
  return a.values.length === b.values.length && key(a) === key(b);
};
