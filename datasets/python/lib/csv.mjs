/** Deterministic CSV text: fixed column order, RFC 4180 quoting, '' for null/undefined, '\n' line endings. */
export function toCsv(columns, rows) {
  const cell = v => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map(r => columns.map(c => cell(r[c])).join(','))].join('\n') + '\n';
}

/** Two decimal places, as text, for money columns (avoids float noise like 12.990000000000002). */
export const money = x => (Math.round(x * 100) / 100).toFixed(2);
