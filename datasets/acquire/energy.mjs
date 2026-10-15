/**
 * Energy extract from EIA-930 Hourly Electric Grid Monitor six-month files, January–June 2024
 * (U.S. Energy Information Administration; U.S. government work, public domain).
 *   node datasets/acquire/energy.mjs <downloads-dir>
 *
 * Selection: twelve large balancing authorities. Hourly demand, forecast, net generation and total
 * interchange are kept as reported, so gaps and anomalies remain; EIA's adjusted series and an
 * imputation flag sit beside them, with hourly net generation by fuel. Fuel mix and BA-to-BA interchange are summed to local calendar days, with the number of
 * reported hours kept beside each total.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { csvRows } from './csv.mjs';
import { readWorkbook } from './xlsx.mjs';
import { writeExtract } from '../lib/extract.mjs';

export const SAMPLED = ['BPAT', 'CISO', 'DUK', 'ERCO', 'FPL', 'ISNE', 'MISO', 'NYIS', 'PJM', 'SOCO', 'SWPP', 'TVA'];
const FUELS = [['COL', 'Coal'], ['NG', 'Natural Gas'], ['NUC', 'Nuclear'], ['OIL', 'All Petroleum Products'], ['WAT', 'Hydropower and Pumped Storage'], ['SUN', 'Solar'], ['WND', 'Wind'], ['OTH', 'Other Fuel Sources'], ['UNK', 'Unknown Fuel Sources']];
/** Hourly fuel columns of the generation table, in FUELS order. */
export const GENERATION_FUEL_COLUMNS = ['coal_mw', 'natural_gas_mw', 'nuclear_mw', 'petroleum_mw', 'hydro_mw', 'solar_mw', 'wind_mw', 'other_mw', 'unknown_mw'];
const dir = process.argv[2];
if (!dir) throw new Error('Usage: node datasets/acquire/energy.mjs <downloads-dir>');
const shas = {};
const read = name => {
  const bytes = fs.readFileSync(path.join(dir, name));
  shas[name] = createHash('sha256').update(bytes).digest('hex');
  return bytes;
};
const pad = n => String(n).padStart(2, '0');
const TIME = /^(\d+)\/(\d+)\/(\d+) (\d+):(\d+):\d+ (AM|PM)$/;
// "01/31/2024 1:00:00 PM" -> "2024-01-31 13:00"
const stamp = text => {
  const m = text.trim().match(TIME);
  if (!m) throw new Error(`Bad time ${text}`);
  let h = Number(m[4]) % 12;
  if (m[6] === 'PM') h += 12;
  return `${m[3]}-${pad(m[1])}-${pad(m[2])} ${pad(h)}:${m[5]}`;
};
const isoDate = text => { const [m, d, y] = text.split('/'); return `${y}-${pad(m)}-${pad(d)}`; };
const num = v => (v === '' || v === undefined ? null : Math.round(Number(v.replace(/,/g, ''))));

const demand = [], generation = [];
const fuelDaily = new Map();
const used = new Set(SAMPLED);
{
  let idx = null;
  for (const row of csvRows(read('EIA930_BALANCE_2024_Jan_Jun.csv').toString('utf8'))) {
    if (!idx) { idx = Object.fromEntries(row.map((h, i) => [h, i])); continue; }
    if (row.length < 10) continue;
    const ba = row[idx['Balancing Authority']];
    if (!SAMPLED.includes(ba)) continue;
    const utc = stamp(row[idx['UTC Time at End of Hour']]), local = stamp(row[idx['Local Time at End of Hour']]);
    const date = isoDate(row[idx['Data Date']]);
    demand.push([ba, utc, local, num(row[idx['Demand (MW)']]), num(row[idx['Demand Forecast (MW)']]),
      date, Number(row[idx['Hour Number']]), num(row[idx['Demand (MW) (Adjusted)']]), num(row[idx['Demand (MW) (Imputed)']]) === null ? 0 : 1]);
    generation.push([ba, utc, num(row[idx['Net Generation (MW)']]), num(row[idx['Total Interchange (MW)']]),
      num(row[idx['Net Generation (MW) (Adjusted)']]), num(row[idx['Total Interchange (MW) (Adjusted)']]),
      ...FUELS.map(([, name]) => num(row[idx[`Net Generation (MW) from ${name}`]]))]);
    for (const [code, name] of FUELS) {
      const v = num(row[idx[`Net Generation (MW) from ${name}`]]);
      if (v === null) continue;
      const key = `${ba}|${date}|${code}`;
      const f = fuelDaily.get(key) ?? { ba, date, code, mwh: 0, hours: 0 };
      f.mwh += v; f.hours++;
      fuelDaily.set(key, f);
    }
  }
}
const interchangeDaily = new Map();
{
  let idx = null;
  for (const row of csvRows(read('EIA930_INTERCHANGE_2024_Jan_Jun.csv').toString('utf8'))) {
    if (!idx) { idx = Object.fromEntries(row.map((h, i) => [h, i])); continue; }
    if (row.length < 8) continue;
    const ba = row[idx['Balancing Authority']];
    if (!SAMPLED.includes(ba)) continue;
    const to = row[idx['Directly Interconnected Balancing Authority']];
    const v = num(row[idx['Interchange (MW)']]);
    const date = isoDate(row[idx['Data Date']]);
    used.add(to);
    const key = `${ba}|${to}|${date}`;
    const x = interchangeDaily.get(key) ?? { ba, to, date, mwh: 0, hours: 0 };
    if (v !== null) { x.mwh += v; x.hours++; }
    interchangeDaily.set(key, x);
  }
}

const wb = readWorkbook(read('EIA930_Reference_Tables.xlsx'));
const bas = [], regions = new Map();
let first = true;
for (const r of wb.rows('xl/worksheets/sheet1.xml')) {
  if (first) { first = false; if (r.A !== 'BA Code' || r.D !== 'Region/Country Code') throw new Error('Unexpected reference layout'); continue; }
  if (!used.has(r.A)) continue;
  regions.set(r.D, r.E);
  bas.push([r.A, r.B, r.C, r.D, r.F === 'Yes' ? 1 : 0, SAMPLED.includes(r.A) ? 1 : 0]);
}
const missing = [...used].filter(c => !bas.some(b => b[0] === c));
if (missing.length) throw new Error(`BAs missing from reference table: ${missing}`);

const out = path.join(path.dirname(new URL(import.meta.url).pathname), '../energy/extract');
const byKey = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
demand.sort((a, b) => byKey(a[0], b[0]) || byKey(a[1], b[1]));
generation.sort((a, b) => byKey(a[0], b[0]) || byKey(a[1], b[1]));
writeExtract(path.join(out, 'regions.tsv.gz'), ['region_code', 'region_name'], [...regions].sort((a, b) => byKey(a[0], b[0])));
writeExtract(path.join(out, 'balancing_authorities.tsv.gz'), ['ba_code', 'ba_name', 'time_zone', 'region_code', 'generation_only', 'hourly_detail'], bas.sort((a, b) => byKey(a[0], b[0])));
writeExtract(path.join(out, 'hourly_demand.tsv.gz'), ['ba_code', 'hour_ending_utc', 'hour_ending_local', 'demand_mw', 'forecast_mw', 'local_date', 'hour_number', 'adjusted_demand_mw', 'demand_imputed'], demand);
writeExtract(path.join(out, 'generation.tsv.gz'), ['ba_code', 'hour_ending_utc', 'net_generation_mw', 'total_interchange_mw', 'adjusted_net_generation_mw', 'adjusted_total_interchange_mw', ...GENERATION_FUEL_COLUMNS], generation);
writeExtract(path.join(out, 'generation_by_fuel.tsv.gz'), ['ba_code', 'date', 'fuel_code', 'generation_mwh', 'hours_reported'],
  [...fuelDaily.values()].sort((a, b) => byKey(a.ba, b.ba) || byKey(a.date, b.date) || byKey(a.code, b.code)).map(f => [f.ba, f.date, f.code, f.mwh, f.hours]));
writeExtract(path.join(out, 'interchange.tsv.gz'), ['from_ba', 'to_ba', 'date', 'interchange_mwh', 'hours_reported'],
  [...interchangeDaily.values()].sort((a, b) => byKey(a.ba, b.ba) || byKey(a.to, b.to) || byKey(a.date, b.date)).map(x => [x.ba, x.to, x.date, x.hours ? x.mwh : null, x.hours]));
fs.writeFileSync(path.join(out, '../source.json'), JSON.stringify({ files: shas, sampled: SAMPLED, window: ['2024-01-01', '2024-06-30'], extracted: { balancing_authorities: bas.length, hourly_demand: demand.length, generation: generation.length, generation_by_fuel: fuelDaily.size, interchange: interchangeDaily.size } }, null, 2) + '\n');
console.log({ bas: bas.length, demand: demand.length, fuel: fuelDaily.size, interchange: interchangeDaily.size });
