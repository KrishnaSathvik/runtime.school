/** Minimal streaming XLSX reader for inline/shared-string worksheets. Never evaluates formulas or macros. */
import { unzipSync, strFromU8 } from 'fflate';
import { SaxesParser } from 'saxes';

export function readWorkbook(bytes) {
  const files = unzipSync(bytes);
  const strings = [];
  let text = '', inText = false;
  const shared = new SaxesParser();
  shared.on('doctype', () => { throw new Error('DTDs are not accepted'); });
  shared.on('opentag', tag => { if (tag.name === 'si') text = ''; if (tag.name === 't') inText = true; });
  shared.on('text', value => { if (inText) text += value; });
  shared.on('closetag', tag => { if (tag.name === 't') inText = false; if (tag.name === 'si') strings.push(text); });
  shared.write(strFromU8(files['xl/sharedStrings.xml'])).close();
  /** Yields one {A: value, B: value, ...} object per row of the given sheet. */
  function* rows(sheetPath) {
    const out = [];
    let row = {}, cell = '', type = '', value = '', inValue = false;
    const parser = new SaxesParser();
    parser.on('doctype', () => { throw new Error('DTDs are not accepted'); });
    parser.on('opentag', tag => {
      if (tag.name === 'row') row = {};
      if (tag.name === 'c') { cell = String(tag.attributes.r).replace(/[0-9]/g, ''); type = tag.attributes.t; value = ''; }
      if (tag.name === 'v' || (tag.name === 't' && type === 'inlineStr')) inValue = true;
    });
    parser.on('text', t => { if (inValue) value += t; });
    parser.on('closetag', tag => {
      if (tag.name === 'v' || tag.name === 't') inValue = false;
      if (tag.name === 'c') row[cell] = type === 's' ? strings[Number(value)] : type === 'inlineStr' || type === 'str' ? value : value === '' ? null : Number(value);
      if (tag.name === 'row') out.push(row);
    });
    const xml = strFromU8(files[sheetPath]);
    const CHUNK = 1 << 22;
    for (let i = 0; i < xml.length; i += CHUNK) {
      parser.write(xml.slice(i, i + CHUNK));
      while (out.length) yield out.shift();
    }
    parser.close();
    while (out.length) yield out.shift();
  }
  return { files, rows };
}

/** Excel serial day to 'YYYY-MM-DD HH:MM:SS' without time-zone interpretation. */
export function excelDate(serial) {
  return new Date(Math.round((serial - 25569) * 86400000)).toISOString().slice(0, 19).replace('T', ' ');
}
