/**
 * Dataset contracts. Every canonical dataset declares:
 *   contract.totalRows   [min, max] across all tables
 *   contract.minRows     per-table minimums (fixtures can never satisfy these)
 *   contract.checks      named SQL probes returning one number, with min/max/equals bounds
 * Standard checks are added for every dataset: declared tables and columns exist,
 * relationships hold, and each fact table is not dominated by a single key.
 */
export function runContract(db, mod) {
  const failures = [];
  const results = [];
  const record = (name, value, ok, expectation) => {
    results.push({ name, value, ok, expectation });
    if (!ok) failures.push(`${name}: got ${value}, expected ${expectation}`);
  };
  const scalar = sql => {
    const r = db.exec(sql)[0];
    return r ? r.values[0][0] : null;
  };
  const c = mod.contract;
  if (!c) return { failures: ['missing contract'], results };

  for (const t of mod.tables) {
    const actual = db.exec(`PRAGMA table_info('${t.name}')`)[0]?.values.map(v => v[1]) ?? [];
    const expected = t.columns.map(col => col.name);
    record(`schema ${t.name}`, actual.join(','), actual.join(',') === expected.join(','), expected.join(','));
  }
  const fkViolations = db.exec('PRAGMA foreign_key_check')[0]?.values.length ?? 0;
  record('relationship integrity (foreign_key_check)', fkViolations, fkViolations === 0, '0 violations');

  let total = 0;
  for (const t of mod.tables) {
    const n = scalar(`SELECT COUNT(*) FROM ${t.name}`);
    total += n;
    const min = c.minRows?.[t.name];
    if (min !== undefined) record(`rows ${t.name}`, n, n >= min, `>= ${min}`);
  }
  const [lo, hi] = c.totalRows;
  record('total rows', total, total >= lo && total <= hi, `${lo}..${hi}`);

  for (const check of c.checks ?? []) {
    let value;
    try { value = scalar(check.sql); } catch (e) { record(check.name, `error: ${e.message}`, false, 'query succeeds'); continue; }
    const v = typeof value === 'string' ? value : Number(value);
    let ok = true, expectation = [];
    if (check.equals !== undefined) { ok &&= v === check.equals; expectation.push(`= ${check.equals}`); }
    if (check.min !== undefined) { ok &&= v >= check.min; expectation.push(`>= ${check.min}`); }
    if (check.max !== undefined) { ok &&= v <= check.max; expectation.push(`<= ${check.max}`); }
    record(check.name, v, ok, expectation.join(' and '));
  }
  return { failures, results };
}

/** Largest share of rows owned by one value: guards against degenerate synthetic distributions. */
export const maxShare = (tableName, column) =>
  `SELECT ROUND(MAX(n) * 1.0 / SUM(n), 4) FROM (SELECT COUNT(*) AS n FROM ${tableName} GROUP BY ${column})`;
export const distinct = (tableName, column) => `SELECT COUNT(DISTINCT ${column}) FROM ${tableName}`;
export const nulls = (tableName, column) => `SELECT COUNT(*) FROM ${tableName} WHERE ${column} IS NULL`;
