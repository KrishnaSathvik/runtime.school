/**
 * Build the twelve canonical Runtime SQL datasets.
 *
 *   node datasets/build.mjs            build every dataset whose inputs changed
 *   node datasets/build.mjs --force    rebuild everything
 *   node datasets/build.mjs flights    build one dataset
 *
 * Inputs: committed real-source extracts (datasets/<id>/extract) or deterministic generators.
 * Outputs: public/datasets/canonical/<id>-<sha12>.sqlite.gz (served, immutable) and
 * src/data/datasets/generated/canonical.json (metadata, schema, previews, asset hashes).
 * The build fails if any dataset violates its contract: row minimums, schema, keys,
 * relationships, distributions and required edge cases.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import initSqlJs from 'sql.js';
import { createSql, indexSql } from './lib/schema.mjs';
import { runContract } from './lib/contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATASET_IDS = ['retail', 'flights', 'saas', 'mobility', 'weather', 'energy', 'payments', 'healthcare', 'iot', 'logistics', 'developer', 'sports'];
const OUT_DIR = path.join(root, 'public/datasets/canonical');
const MANIFEST = path.join(root, 'src/data/datasets/generated/canonical.json');
const PREVIEW_ROWS = 12;

function inputHash(id) {
  const h = createHash('sha256');
  const add = dir => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir).sort()) {
      const p = path.join(dir, name);
      if (fs.statSync(p).isDirectory()) add(p);
      else h.update(path.relative(root, p)).update(fs.readFileSync(p));
    }
  };
  add(path.join(root, 'datasets/lib'));
  add(path.join(root, 'datasets', id));
  h.update(fs.readFileSync(fileURLToPath(import.meta.url)));
  return h.digest('hex');
}

function previewOf(db, t) {
  const order = t.primaryKey.join(', ');
  const res = db.exec(`SELECT * FROM ${t.name} ORDER BY ${order} LIMIT ${PREVIEW_ROWS}`)[0];
  return {
    columns: t.columns.map(c => ({
      name: c.name, type: c.type, key: t.primaryKey.includes(c.name) ? 'PK' : null,
      references: t.foreignKeys.find(f => f.columns.includes(c.name))?.table,
    })),
    result: res ?? { columns: t.columns.map(c => c.name), values: [] },
    total: db.exec(`SELECT COUNT(*) FROM ${t.name}`)[0].values[0][0],
  };
}

export async function buildDataset(SQL, id) {
  const mod = (await import(pathToFileURL(path.join(root, 'datasets', id, 'dataset.mjs')).href)).default;
  if (mod.id !== id) throw new Error(`${id}: module id mismatch`);
  const started = Date.now();
  const data = await mod.rows({ root, dir: path.join(root, 'datasets', id) });
  const db = new SQL.Database();
  try {
    db.exec('PRAGMA foreign_keys=OFF; PRAGMA page_size=4096;');
    for (const t of mod.tables) db.exec(createSql(t));
    db.exec('BEGIN');
    for (const t of mod.tables) {
      const rows = data[t.name];
      if (!rows) throw new Error(`${id}.${t.name}: generator returned no rows array`);
      const stmt = db.prepare(`INSERT INTO ${t.name} VALUES (${t.columns.map(() => '?').join(',')})`);
      try {
        for (const row of rows) {
          if (row.length !== t.columns.length) throw new Error(`${id}.${t.name}: row width ${row.length}, expected ${t.columns.length}: ${JSON.stringify(row)}`);
          stmt.run(row);
        }
      } finally { stmt.free(); }
    }
    db.exec('COMMIT');
    for (const t of mod.tables) for (const sql of indexSql(t)) db.exec(sql);
    db.exec('ANALYZE; VACUUM;');
    const integrity = db.exec('PRAGMA integrity_check')[0].values[0][0];
    if (integrity !== 'ok') throw new Error(`${id}: integrity ${integrity}`);
    const contract = runContract(db, mod);
    if (contract.failures.length) throw new Error(`${id} contract failed:\n  ${contract.failures.join('\n  ')}`);
    const previews = Object.fromEntries(mod.tables.map(t => [t.name, previewOf(db, t)]));
    const rows = Object.fromEntries(mod.tables.map(t => [t.name, previews[t.name].total]));
    // The changed-data fixture must apply cleanly and keep every relationship valid.
    db.exec('SAVEPOINT mutation_probe');
    db.exec(mod.mutation);
    const broken = db.exec('PRAGMA foreign_key_check')[0]?.values ?? [];
    db.exec('ROLLBACK TO mutation_probe; RELEASE mutation_probe');
    for (const t of mod.tables) {
      const after = db.exec(`SELECT COUNT(*) FROM ${t.name}`)[0].values[0][0];
      if (after !== rows[t.name]) throw new Error(`${id}.${t.name}: mutation probe leaked into the canonical file`);
    }
    if (broken.length) throw new Error(`${id}: mutation breaks relationships ${JSON.stringify(broken.slice(0, 5))}`);
    const bytes = Buffer.from(db.export());
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const gz = gzipSync(bytes, { level: 9 });
    const file = `${id}-${sha256.slice(0, 12)}.sqlite.gz`;
    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const old of fs.readdirSync(OUT_DIR)) if (old.startsWith(`${id}-`) && old !== file) fs.rmSync(path.join(OUT_DIR, old));
    fs.writeFileSync(path.join(OUT_DIR, file), gz);
    const { rows: _rows, ...meta } = mod;
    void _rows;
    return {
      metadata: {
        ...meta,
        rows,
        totals: {
          rows: Object.values(rows).reduce((a, b) => a + b, 0),
          tables: mod.tables.length,
          columns: mod.tables.reduce((a, t) => a + t.columns.length, 0),
        },
      },
      ref: { datasetId: id, datasetVersion: mod.version },
      asset: { url: `/datasets/canonical/${file}`, sha256, bytes: bytes.length, gzipBytes: gz.length },
      previews,
      mutation: mod.mutation,
      contract: contract.results,
      inputHash: inputHash(id),
      buildMs: Date.now() - started,
    };
  } finally { db.close(); }
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const only = args.filter(a => !a.startsWith('--'));
  const ids = only.length ? only : DATASET_IDS;
  const previous = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  const SQL = await initSqlJs();
  const manifest = {};
  for (const id of DATASET_IDS) {
    const prior = previous[id];
    const fresh = prior && prior.inputHash === inputHash(id) && fs.existsSync(path.join(root, 'public', prior.asset.url));
    if (!ids.includes(id) || (fresh && !force)) {
      if (prior) manifest[id] = prior;
      if (ids.includes(id)) console.log(`${id}: up to date`);
      continue;
    }
    if (!fs.existsSync(path.join(root, 'datasets', id, 'dataset.mjs'))) { console.warn(`${id}: no dataset module yet`); continue; }
    const built = await buildDataset(SQL, id);
    manifest[id] = built;
    const { totals } = built.metadata;
    console.log(`${id}: ${totals.rows.toLocaleString()} rows, ${totals.tables} tables, ${totals.columns} columns, ` +
      `${(built.asset.bytes / 1e6).toFixed(1)} MB (${(built.asset.gzipBytes / 1e6).toFixed(1)} MB gz) in ${built.buildMs} ms`);
  }
  fs.mkdirSync(path.dirname(MANIFEST), { recursive: true });
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(e => { console.error(e.message); process.exit(1); });
}
