/**
 * Committed real-source extracts: gzipped TSV, one file per canonical table.
 * First line is the header. `\N` is NULL. Tabs/newlines/backslashes in text are escaped.
 * Numbers are written as plain decimals so the extract diff is stable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

const escape = v => String(v).replace(/\\/g, '\\\\').replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r');
const unescape = v => v.replace(/\\(.)/g, (_, c) => (c === 't' ? '\t' : c === 'n' ? '\n' : c === 'r' ? '\r' : c));

export function writeExtract(file, columns, rows) {
  const lines = [columns.join('\t')];
  for (const row of rows) {
    if (row.length !== columns.length) throw new Error(`${file}: row width ${row.length} != ${columns.length}`);
    lines.push(row.map(v => (v === null || v === undefined ? '\\N' : escape(v))).join('\t'));
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // mtime is zeroed by gzip header defaults in Node, so output bytes are deterministic.
  fs.writeFileSync(file, gzipSync(lines.join('\n') + '\n', { level: 9 }));
  return rows.length;
}

/** Returns {columns, rows}; numeric-looking values are converted only for columns listed in `numeric`. */
export function readExtract(file, numeric = []) {
  const text = gunzipSync(fs.readFileSync(file)).toString('utf8');
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const columns = lines[0].split('\t');
  const numericIdx = new Set(numeric.map(c => { const i = columns.indexOf(c); if (i < 0) throw new Error(`${file}: no column ${c}`); return i; }));
  const rows = new Array(lines.length - 1);
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split('\t');
    for (let j = 0; j < parts.length; j++) {
      const v = parts[j];
      if (v === '\\N') parts[j] = null;
      else if (numericIdx.has(j)) parts[j] = Number(v);
      else if (v.includes('\\')) parts[j] = unescape(v);
    }
    rows[i - 1] = parts;
  }
  return { columns, rows };
}
