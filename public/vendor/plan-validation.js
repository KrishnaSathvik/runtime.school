/* The shipped worker and integration tests load this same implementation.
 * EQP text is SQLite-version-specific: see docs/PLAN_VALIDATION.md before upgrading.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- imported by engine.js via importScripts
function validatePlan(db, sql, spec, checks = [], fixture = 'original') {
  const record = (label, ok, detail) => checks.push({ label, ok, detail, fixture });
  const literal = value => "'" + String(value).replace(/'/g, "''") + "'";
  const read = sql => db.exec(sql)[0]?.values ?? [];
  const fail = message => ({ ok: false, message, planFailed: true });
  const clean = sql.replace(/--[^\n]*|\/\*[\s\S]*?\*\//g, '').trim();
  if (!/^(SELECT|WITH)\b/i.test(clean)) {
    return fail('End the optimization script with the SELECT or WITH query whose output and access strategy should be checked.');
  }
  if (!Array.isArray(spec.indexes) || !spec.indexes.length) throw Error('Invalid plan contract: specify required indexes.');
  const names = new Map();
  for (const required of spec.indexes) {
    if (!required.id || names.has(required.id) || !required.columns?.length) throw Error('Invalid plan index contract.');
    // Main-schema indexes cannot establish anything about a shadowing TEMP table.
    if (read(`SELECT name FROM sqlite_temp_schema WHERE type IN ('table','view') AND name=${literal(required.table)} COLLATE NOCASE`).length) {
      return fail(`Use the original ${required.table} table for this optimization task, without a TEMP replacement.`);
    }
    const indexes = read(`SELECT name, "unique", partial FROM pragma_index_list(${literal(required.table)}, 'main')`);
    const matches = indexes.filter(([name, unique, partial]) => {
      if (partial || (required.unique !== undefined && !!unique !== required.unique)) return false;
      const keys = read(`SELECT name, coll FROM pragma_index_xinfo(${literal(name)}, 'main') WHERE key=1 ORDER BY seqno`);
      return keys.length === required.columns.length && keys.every(([column, collation], i) =>
        column !== null && String(column).toLowerCase() === required.columns[i].toLowerCase() && collation === 'BINARY');
    }).map(([name]) => name);
    record('Required index: ' + required.id, matches.length > 0, matches.length ? 'Index found with the expected columns and key order.' : 'Expected a full index on ' + required.table + ' (' + required.columns.join(', ') + ').');
    if (!matches.length) return fail(`Create a full index on ${required.table} (${required.columns.join(', ')}) in that column order${required.unique ? ' with UNIQUE' : ''}. The required index definition is missing.`);
    names.set(required.id, matches);
  }
  // Rebuild statistics after learner DDL. Automatic indexes must not substitute
  // for the authored objective. Reset these even if the learner changed PRAGMAs.
  const readOnly = read('PRAGMA query_only')[0][0];
  db.exec('PRAGMA query_only=OFF');
  try { db.exec('PRAGMA automatic_index=OFF; PRAGMA analysis_limit=0; ANALYZE main;'); }
  finally { db.exec(`PRAGMA query_only=${readOnly ? 'ON' : 'OFF'}`); }
  const details = read('EXPLAIN QUERY PLAN ' + sql).map(row => String(row[3]));
  for (const assertion of spec.access ?? []) {
    const indexes = names.get(assertion.index);
    if (!indexes || !['search', 'covering-search', 'index-scan'].includes(assertion.strategy)) throw Error('Invalid plan access contract.');
    const matched = details.some(detail => {
      const node = /^(SEARCH|SCAN) .+? USING (COVERING )?INDEX (.+)$/.exec(detail);
      if (!node) return false;
      // Match the complete catalog name, not a substring or a generic SEARCH.
      const usesIndex = indexes.some(name => node[3] === name || (node[1] === 'SEARCH' && node[3].startsWith(name) && /^ \([^()]*\)$/.test(node[3].slice(name.length))));
      return usesIndex && (assertion.strategy === 'index-scan' ? node[1] === 'SCAN' :
        node[1] === 'SEARCH' && (assertion.strategy !== 'covering-search' || !!node[2]));
    });
    record('Access strategy: ' + assertion.strategy, matched, matched ? 'The submitted query uses the required indexed access.' : 'Review the WHERE conditions and index key order. The required access was not found.');
    if (!matched) return fail(`The output is correct, but this task requires ${assertion.strategy} using the index for ${assertion.index}. Observed plan: ${details.join('; ')}`);
  }
  if (spec.noFullScans && details.some(detail => /^SCAN /.test(detail) && !/ USING (COVERING )?INDEX /.test(detail))) {
    return fail('The output is correct, but this task requires avoiding unindexed scans throughout the query. Observed plan: ' + details.join('; '));
  }
  if (spec.noTempSort) record('Avoid temporary sorts', !details.some(detail => /\bTEMP B-TREE\b/.test(detail)), 'The task explicitly requires ordering without a temporary B-tree.');
  if (spec.noTempSort && details.some(detail => /\bTEMP B-TREE\b/.test(detail))) {
    return fail('The output is correct, but this task requires avoiding a temporary sorting B-tree. Observed plan: ' + details.join('; '));
  }
  return null;
}
