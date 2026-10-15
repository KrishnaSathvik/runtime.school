/** Small helpers so dataset modules read like a data dictionary. */
export const col = (name, type, meaning, nullable = false) => ({ name, type, meaning, nullable });
export const fk = (columns, table, references) => ({
  columns: [].concat(columns),
  table,
  references: [].concat(references ?? columns),
});
export function table(name, grain, columns, { primaryKey, foreignKeys = [], indexes = [] } = {}) {
  return { name, grain, primaryKey: primaryKey ?? [columns[0].name], columns, foreignKeys, indexes };
}

/** SQLite DDL. Primary keys and NOT NULL are enforced; foreign keys are declared and checked after load. */
export function createSql(t) {
  const single = t.primaryKey.length === 1 ? t.primaryKey[0] : null;
  const defs = t.columns.map(c => {
    const pk = single === c.name ? (c.type === 'INTEGER' ? ' PRIMARY KEY' : ' PRIMARY KEY NOT NULL') : '';
    return `  ${c.name} ${c.type}${pk}${!pk && !c.nullable ? ' NOT NULL' : ''}`;
  });
  if (!single && t.primaryKey.length) defs.push(`  PRIMARY KEY (${t.primaryKey.join(', ')})`);
  for (const f of t.foreignKeys) defs.push(`  FOREIGN KEY (${f.columns.join(', ')}) REFERENCES ${f.table} (${f.references.join(', ')})`);
  return `CREATE TABLE ${t.name} (\n${defs.join(',\n')}\n)${single && t.columns.find(c => c.name === single).type !== 'INTEGER' ? ' WITHOUT ROWID' : ''};`;
}

export function indexSql(t) {
  return t.indexes.map(cols => `CREATE INDEX idx_${t.name}_${cols.join('_')} ON ${t.name} (${cols.join(', ')});`);
}
