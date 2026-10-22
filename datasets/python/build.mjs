/**
 * Build the Python course datasets (docs/python/curriculum-plan.md §2).
 *
 *   node datasets/python/build.mjs           build every dataset
 *   node datasets/python/build.mjs D08 R02   build some
 *   node datasets/python/build.mjs --check   rebuild in memory and fail if anything differs from the manifests
 *
 * Inputs are generators (seeded) or committed extracts of real sources (datasets/python/<id>/extract, written by
 * that dataset's acquire.mjs). The build never touches the network.
 *
 * Outputs:
 *   public/datasets/python/<id>/<edition>.<version>/…   edition files (gitignored; rebuilt deterministically)
 *   src/content/python-v2/datasets/<id>.json             manifest: dictionary, keys, files + sha256, profile, quality problems
 *
 * Every table is written as CSV. A dataset can add other files per edition (JSON, JSONL, GeoJSON, recorded API
 * pages) with `extraFiles`, and Parquet copies of chosen tables with `parquet` (written by pyarrow in Pyodide,
 * typed from the data dictionary; reused while the source CSV is unchanged).
 * A published version is never overwritten: if the output changes but the dataset's version doesn't, the build fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { toCsv } from './lib/csv.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const PY_DATASET_IDS = ['R01', 'R02', 'D02', 'D03', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15'];
const PUBLIC = path.join(root, 'public/datasets/python');
const MANIFESTS = path.join(root, 'src/content/python-v2/datasets');

const sha256 = data => createHash('sha256').update(data).digest('hex');
const FORMAT = { csv: 'csv', json: 'json', jsonl: 'jsonl', geojson: 'geojson', parquet: 'parquet', txt: 'text', db: 'sqlite' };
const formatOf = rel => FORMAT[rel.split('.').pop()] ?? 'text';

function profile(rows, columns) {
  const out = {};
  for (const c of columns) {
    const values = rows.map(r => r[c.name]);
    const present = values.filter(v => v !== null && v !== undefined && v !== '');
    const entry = { nulls: values.length - present.length, distinct: new Set(present.map(String)).size };
    const nums = present.filter(v => typeof v === 'number');
    if (nums.length === present.length && nums.length) {
      let min = Infinity, max = -Infinity, sum = 0;
      for (const n of nums) { if (n < min) min = n; if (n > max) max = n; sum += n; }
      Object.assign(entry, { min, max, mean: Math.round((sum / nums.length) * 100) / 100 });
    } else if (c.type === 'timestamp' || c.type === 'date') {
      const sorted = present.map(String).sort();
      Object.assign(entry, { min: sorted[0], max: sorted.at(-1) });
    }
    out[c.name] = entry;
  }
  return out;
}

/** Key and relationship checks for one edition. Returns problems; the build fails on any. */
function integrity(def, tables) {
  const problems = [];
  for (const [name, t] of Object.entries(def.tables)) {
    if (!tables[name]) { problems.push(`${name}: missing from the edition`); continue; }
    const seen = new Set();
    for (const r of tables[name]) {
      if (t.primaryKey.length) {
        const k = t.primaryKey.map(c => r[c]).join('|');
        if (seen.has(k)) problems.push(`${name}: duplicate key ${k}`);
        seen.add(k);
      }
      for (const c of t.columns) if (!c.nullable && (r[c.name] === null || r[c.name] === undefined)) problems.push(`${name}.${c.name}: unexpected null`);
    }
    for (const fk of t.foreignKeys ?? []) {
      const [rt, rc] = fk.references.split('.');
      const keys = new Set(tables[rt].map(r => r[rc]));
      // A nullable reference may be empty; a present one must resolve unless the dataset documents orphans.
      const orphans = tables[name].filter(r => r[fk.column] !== null && r[fk.column] !== undefined && r[fk.column] !== '' && !keys.has(r[fk.column])).length;
      if (orphans && !fk.orphansAllowed) problems.push(`${name}.${fk.column}: ${orphans} rows reference a missing ${fk.references}`);
    }
  }
  return problems.slice(0, 20);
}

// ---------------- Parquet (pyarrow in Pyodide) ----------------

const ARROW = { integer: 'pa.int64()', decimal: 'pa.float64()', boolean: 'pa.bool_()', text: 'pa.string()', date: 'pa.date32()', timestamp: 'pa.timestamp("s")' };
let pyodide = null;
async function parquetFromCsv(csvText, columns) {
  if (!pyodide) {
    const { loadPyodide } = await import('pyodide');
    pyodide = await loadPyodide({ indexURL: path.join(root, 'public/vendor/pyodide/314.0.7/') });
    await pyodide.loadPackage(['pyarrow'], { messageCallback: () => {} });
    pyodide.runPython('import io, pyarrow as pa, pyarrow.csv as pc, pyarrow.parquet as pq');
  }
  pyodide.FS.writeFile('/tmp/in.csv', csvText);
  const types = `{${columns.map(c => `${JSON.stringify(c.name)}: ${ARROW[c.type] ?? 'pa.string()'}`).join(', ')}}`;
  pyodide.runPython(`
_t = pc.read_csv("/tmp/in.csv", convert_options=pc.ConvertOptions(column_types=${types}, strings_can_be_null=True, quoted_strings_can_be_null=False))
pq.write_table(_t, "/tmp/out.parquet", compression="zstd", row_group_size=50000)
del _t`);
  return Buffer.from(pyodide.FS.readFile('/tmp/out.parquet'));
}

export async function buildPythonDataset(id, old = null) {
  const def = (await import(pathToFileURL(path.join(root, 'datasets/python', id, 'dataset.mjs')).href)).default;
  const full = def.generate();
  const files = [];
  const editions = {};
  const oldFiles = new Map(Object.values(old?.editions ?? {}).flatMap(e => e.files ?? []).map(f => [f.url, f]));
  for (const [edition, target] of Object.entries(def.editions)) {
    const tables = def.cutEdition(full, edition, target);
    const problems = integrity(def, tables);
    if (problems.length) throw new Error(`${id}@${edition}: ${problems.join('; ')}`);
    const ref = `${id}@${edition}.${def.version}`;
    const base = `${id}/${edition}.${def.version}`;
    const entry = { ref, files: [], quality: [] };
    const add = (rel, table, layer, data, rows, extra = {}) => {
      files.push({ rel: `${base}/${rel}`, data });
      entry.files.push({ path: rel, table, layer, format: formatOf(rel), rows, bytes: Buffer.byteLength(data), sha256: sha256(data), url: `/datasets/python/${base}/${rel}`, ...extra });
    };
    entry.profile = {};
    for (const [name, t] of Object.entries(def.tables)) {
      const csv = toCsv(t.columns.map(c => c.name), tables[name]);
      add(`${name}.csv`, name, 'clean', csv, tables[name].length);
      entry.profile[name] = profile(tables[name], t.columns);
      if ((def.parquet?.tables ?? []).includes(name) && (def.parquet.editions ?? ['standard', 'full']).includes(edition)) {
        const url = `/datasets/python/${base}/${name}.parquet`;
        const prior = oldFiles.get(url);
        const disk = path.join(PUBLIC, base, `${name}.parquet`);
        const from = sha256(csv);
        const bytes = prior?.from === from && fs.existsSync(disk) && sha256(fs.readFileSync(disk)) === prior.sha256 ? fs.readFileSync(disk) : await parquetFromCsv(csv, t.columns);
        add(`${name}.parquet`, name, 'clean', bytes, tables[name].length, { from });
      }
    }
    for (const x of def.extraFiles?.(tables, edition, full) ?? []) add(x.path, x.table, x.layer ?? 'clean', x.text, x.rows);
    // Generated datasets also ship a deliberately messy raw/ export; real sources keep their real gaps only.
    if (edition !== 'preview' && def.makeRaw) {
      const raw = def.makeRaw(tables, def.seed + edition.length * 7919);
      for (const [name, rows] of Object.entries(raw.tables)) add(`raw/${name}.csv`, name, 'raw', toCsv(def.tables[name].columns.map(c => c.name), rows), rows.length);
      entry.quality = Object.entries(raw.counts).map(([issue, count]) => ({ id: issue, description: def.rawIssues[issue], count }));
    }
    // Real sources: the problems that are really in the data, counted per edition.
    if (def.realIssues) entry.quality = def.realIssues(tables).map(q => ({ id: q.id, description: q.description, count: q.count }));
    editions[edition] = entry;
  }
  // Stress data isn't stored: it's generated on demand with a recorded seed and scale.
  if (def.stress === undefined && def.seed !== null) editions.stress = { ref: `${id}@stress.${def.version}`, onDemand: true, recipe: `generateMarket(seed=${def.seed}, scale=N) from datasets/python/${id}/generate.mjs` };
  const manifest = {
    id: def.id, title: def.title, version: def.version, seed: def.seed, description: def.description, licence: def.licence,
    window: def.window, generator: def.generator ?? `datasets/python/${id}/generate.mjs`, ...(def.source ? { source: def.source } : {}),
    ...(def.attribution ? { attribution: def.attribution } : {}),
    tables: Object.fromEntries(Object.entries(def.tables).map(([k, t]) => [k, { description: t.description, primaryKey: t.primaryKey, foreignKeys: t.foreignKeys ?? [], columns: t.columns }])),
    editions,
  };
  return { manifest, files };
}

async function main() {
  const check = process.argv.includes('--check');
  const ids = process.argv.slice(2).filter(a => !a.startsWith('--'));
  for (const id of ids.length ? ids : PY_DATASET_IDS) {
    const manifestPath = path.join(MANIFESTS, `${id}.json`);
    const old = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf8') : null;
    const { manifest, files } = await buildPythonDataset(id, old ? JSON.parse(old) : null);
    const text = JSON.stringify(manifest, null, 1) + '\n';
    // Published edition files are immutable: the same URL must keep the same bytes. Manifest wording may change.
    if (old) {
      const before = new Map(Object.values(JSON.parse(old).editions).flatMap(e => e.files ?? []).map(f => [f.url, f.sha256]));
      const changed = Object.values(manifest.editions).flatMap(e => e.files ?? []).filter(f => before.has(f.url) && before.get(f.url) !== f.sha256);
      if (changed.length) throw new Error(`${id}: ${changed[0].url} changed but version ${manifest.version} is already published. Bump the version in datasets/python/${id}/dataset.mjs.`);
    }
    if (check) {
      if (old !== text) throw new Error(`${id}: manifest is out of date; run npm run datasets:python`);
      console.log(`ok ${id} (unchanged)`);
      continue;
    }
    for (const f of files) {
      const p = path.join(PUBLIC, f.rel);
      fs.mkdirSync(path.dirname(p), { recursive: true });
      const data = typeof f.data === 'string' ? Buffer.from(f.data) : f.data;
      if (!fs.existsSync(p) || !fs.readFileSync(p).equals(data)) fs.writeFileSync(p, data);
    }
    // Files a previous build left in this dataset's folder that no edition lists any more.
    const listed = new Set(files.map(f => path.join(PUBLIC, f.rel)));
    const sweep = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { sweep(p); if (!fs.readdirSync(p).length) fs.rmdirSync(p); } else if (!listed.has(p)) fs.unlinkSync(p); } };
    if (fs.existsSync(path.join(PUBLIC, id))) sweep(path.join(PUBLIC, id));
    fs.mkdirSync(MANIFESTS, { recursive: true });
    if (old !== text) fs.writeFileSync(manifestPath, text);
    const sizes = Object.entries(manifest.editions).filter(([, e]) => e.files).map(([k, e]) => {
      const main = e.files.filter(f => f.layer === 'clean' && f.format === 'csv').sort((a, b) => b.rows - a.rows)[0];
      return `${k}: ${main.rows} ${main.table}, ${(e.files.reduce((s, f) => s + f.bytes, 0) / 1e6).toFixed(2)} MB`;
    });
    console.log(`built ${id}  ${sizes.join(' · ')}`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
