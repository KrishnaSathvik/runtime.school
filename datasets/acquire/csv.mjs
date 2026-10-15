/** RFC 4180-style CSV reader: quoted commas/newlines and doubled quotes. */
export function* csvRows(text) {
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === ',' && !quoted) { row.push(field); field = ''; }
    else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); yield row; row = []; field = '';
    } else field += ch;
  }
  if (quoted) throw new Error('Unterminated CSV quote');
  if (field || row.length) { row.push(field); yield row; }
}
