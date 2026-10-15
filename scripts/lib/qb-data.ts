// Node-only helpers shared by the inventory generator and tests.
import fs from "fs";
import path from "path";
import { gunzipSync } from "zlib";
import { createRequire } from "module";
import { databaseOf, seedOverlay } from "@/engine/sql-client";
import { lessons, courseOrder, lessonFixture } from "@/content";
import { allQuestions, bankQuestions, bankSeed, practiceDatasets } from "@/content/question-bank";
import { featureTags, rubricDifficulty, rubricScore, sqlFeatures } from "@/content/question-bank/rubric";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
let SQL: { Database: new (bytes?: Uint8Array) => Db } | null = null;
const datasetBytes = new Map<string, Uint8Array>();

export async function sqlEngine() {
  if (!SQL) {
    const init = require(path.resolve(process.cwd(), "public/vendor/sql-wasm.js"));
    SQL = await init({ locateFile: (f: string) => path.resolve(process.cwd(), "public/vendor", f) });
  }
  return SQL!;
}

/** Opens a seed: a canonical database named by its directive line (plus overlay SQL), or plain seed SQL. */
export async function freshDb(seedSql: string): Promise<Db> {
  const S = await sqlEngine();
  const ref = databaseOf(seedSql);
  if (!ref) {
    const db = new S.Database();
    db.exec(seedSql);
    return db;
  }
  let bytes = datasetBytes.get(ref.url);
  if (!bytes) {
    bytes = new Uint8Array(gunzipSync(fs.readFileSync(path.resolve(process.cwd(), "public", ref.url.replace(/^\//, "")))));
    datasetBytes.set(ref.url, bytes);
  }
  const db = new S.Database(bytes);
  const overlay = seedOverlay(seedSql);
  if (overlay.trim()) db.exec(overlay);
  return db;
}

/** Runs a script and returns its last result table. */
export function lastResult(db: Db, sql: string): { columns: string[]; values: unknown[][] } {
  const res = db.exec(sql);
  const last = res[res.length - 1];
  if (last) return { columns: last.columns, values: last.values };
  // An empty result still has columns: read them from the prepared statement.
  let columns: string[] = [];
  try {
    const stmt = db.prepare(sql);
    try { columns = stmt.getColumnNames(); } finally { stmt.free(); }
  } catch { /* multi-statement scripts have no single column list */ }
  return { columns, values: [] };
}

export type Example = { columns: string[]; rows: unknown[][]; total: number };

/** First rows of each bank question's expected output on the visible data. */
export async function computeExamples(): Promise<Record<string, Example>> {
  const out: Record<string, Example> = {};
  for (const q of bankQuestions) {
    const db = await freshDb(bankSeed(q));
    const r = lastResult(db, q.solution);
    out[q.id] = { columns: r.columns, rows: r.values.slice(0, 3), total: r.values.length };
    db.close();
  }
  return out;
}

/** Complete small V4 inputs, generated from the same database used by Run/Check. */
export async function computeInputPreviews() {
  const out:Record<string,Record<string,{result:{columns:string[];values:unknown[][]};total:number}>>={};
  for(const q of bankQuestions.filter(q=>q.datasetRef || q.exerciseType || q.setupSql || q.caseStudy?.id === "regional-capacity")) {
    const db=await freshDb(bankSeed(q));out[q.id]={};
    // Small samples are shown whole; large tables show their first rows while queries run on all of them.
    for(const table of q.tables) {const total=Number(lastResult(db,`SELECT COUNT(*) FROM ${table}`).values[0][0]);const result=lastResult(db,`SELECT * FROM ${table} LIMIT ${total<=20?20:12}`);out[q.id][table]={result,total};}
    db.close();
  }
  return out;
}

/** Output columns of every original challenge's reference answer. */
export async function existingOutputs(): Promise<Record<string, { columns: string[]; rows: number }>> {
  const out: Record<string, { columns: string[]; rows: number }> = {};
  for (const id of courseOrder) {
    for (const v of [0, 1]) {
      const db = await freshDb(lessonFixture(lessons[id]).seed);
      try {
        const r = lastResult(db, lessons[id].tasks[v].answer);
        out[`lc-${id}-${v}`] = { columns: r.columns, rows: r.values.length };
      } finally {
        db.close();
      }
    }
  }
  return out;
}

export function rubricFor(sql: string, validators: number) {
  const f = sqlFeatures(sql, validators);
  const score = rubricScore(f);
  return { features: f, score, difficulty: rubricDifficulty(score, f), tags: featureTags(f) };
}

export { allQuestions, bankQuestions, bankSeed, practiceDatasets, lessons, courseOrder };
