// Node-only helpers shared by the inventory generator and tests.
import path from "path";
import { createRequire } from "module";
import { lessons, courseOrder, projects, seed } from "@/content";
import { allQuestions, bankQuestions, bankSeed, practiceDatasets, practiceSeed } from "@/content/question-bank";
import { featureTags, rubricDifficulty, rubricScore, sqlFeatures } from "@/content/question-bank/rubric";

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;
let SQL: { Database: new () => Db } | null = null;

export async function sqlEngine() {
  if (!SQL) {
    const init = require(path.resolve(process.cwd(), "public/vendor/sql-wasm.js"));
    SQL = await init({ locateFile: (f: string) => path.resolve(process.cwd(), "public/vendor", f) });
  }
  return SQL!;
}

export async function freshDb(seedSql: string): Promise<Db> {
  const S = await sqlEngine();
  const db = new S.Database();
  db.exec(seedSql);
  return db;
}

/** Runs a script and returns its last result table. */
export function lastResult(db: Db, sql: string): { columns: string[]; values: unknown[][] } {
  const res = db.exec(sql);
  const last = res[res.length - 1];
  return last ? { columns: last.columns, values: last.values } : { columns: [], values: [] };
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
  for(const q of bankQuestions.filter(q=>q.exerciseType || q.setupSql || q.caseStudy?.id === "regional-capacity")) {
    const db=await freshDb(bankSeed(q));out[q.id]={};
    for(const table of q.tables) {const result=lastResult(db,`SELECT * FROM ${table}`);out[q.id][table]={result:{...result,values:result.values.length>100 ? result.values.slice(0,5) : result.values},total:result.values.length};}
    db.close();
  }
  return out;
}

export type TableInfo = {
  name: string;
  rows: number;
  columns: Array<{ name: string; type: string; notnull: boolean; pk: boolean }>;
  foreignKeys: Array<{ column: string; references: string }>;
};

export async function tableInfo(): Promise<Record<string, TableInfo>> {
  const db = await freshDb(practiceSeed);
  const names = lastResult(db, "SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").values.map(
    (v) => String(v[0]),
  );
  const out: Record<string, TableInfo> = {};
  for (const n of names) {
    const cols = lastResult(db, `SELECT name, type, "notnull", pk FROM pragma_table_info('${n}')`).values;
    const fks = lastResult(db, `SELECT "from", "table", "to" FROM pragma_foreign_key_list('${n}')`).values;
    out[n] = {
      name: n,
      rows: Number(lastResult(db, `SELECT COUNT(*) FROM "${n}"`).values[0][0]),
      columns: cols.map((c) => ({ name: String(c[0]), type: String(c[1] || "ANY"), notnull: c[2] === 1, pk: Number(c[3]) > 0 })),
      foreignKeys: fks.map((f) => ({ column: String(f[0]), references: `${f[1]}(${f[2] ?? "rowid"})` })),
    };
  }
  db.close();
  return out;
}

/** Output columns of every original challenge's reference answer. */
export async function existingOutputs(): Promise<Record<string, { columns: string[]; rows: number }>> {
  const out: Record<string, { columns: string[]; rows: number }> = {};
  for (const id of courseOrder) {
    for (const v of [0, 1]) {
      const db = await freshDb(seed);
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

export { allQuestions, bankQuestions, bankSeed, practiceDatasets, lessons, courseOrder, projects };
