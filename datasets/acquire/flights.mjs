/**
 * U.S. Flights extract from BTS Reporting Carrier On-Time Performance (U.S. government work, public domain),
 * January–March 2025, plus airport names/coordinates from OurAirports (public domain).
 *   node datasets/acquire/flights.mjs <downloads-dir>
 *
 * Selection: every flight operated by a deterministic 7.5% sample of aircraft (FNV-1a of tail number).
 * Sampling whole aircraft keeps each tail's rotation intact, so the previous flight of the same aircraft
 * is in the data. Flights without a tail number are sampled by carrier, flight number and date.
 * Times are local clock times at the airport where the event happens, as BTS records them.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import { csvRows } from './csv.mjs';
import { writeExtract } from '../lib/extract.mjs';
import { hash32 } from '../lib/rng.mjs';
import { SOURCES } from './sources.mjs';

const SAMPLE_PER_MILLE = 75;
const dir = process.argv[2];
if (!dir) throw new Error('Usage: node datasets/acquire/flights.mjs <downloads-dir>');
const verify = name => {
  const bytes = fs.readFileSync(path.join(dir, name));
  const sha = createHash('sha256').update(bytes).digest('hex');
  if (sha !== SOURCES[name].sha256 && !SOURCES[name].living) throw new Error(`${name}: unexpected hash`);
  return { bytes, sha };
};

const pad = n => String(n).padStart(2, '0');
const addMinutes = (stamp, minutes) => {
  const d = new Date(`${stamp.replace(' ', 'T')}:00Z`);
  d.setUTCMinutes(d.getUTCMinutes() + minutes);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};
const clock = (date, hhmm) => {
  const v = Number(hhmm);
  return addMinutes(`${date} 00:00`, Math.floor(v / 100) * 60 + (v % 100));
};
const minutesOfDay = hhmm => { const v = Number(hhmm) % 2400; return Math.floor(v / 100) * 60 + (v % 100); };
const int = v => (v === '' ? null : Math.round(Number(v)));

const flights = [];
const airportInfo = new Map();
let sourceRows = 0;
const months = ['bts-2025-1.zip', 'bts-2025-2.zip', 'bts-2025-3.zip'];
const shas = {};
for (const name of months) {
  const { bytes, sha } = verify(name);
  shas[name] = sha;
  const zip = unzipSync(bytes);
  const csvName = Object.keys(zip).find(n => n.endsWith('.csv'));
  let header = null, idx = null;
  for (const row of csvRows(strFromU8(zip[csvName]))) {
    if (!header) { header = row; idx = Object.fromEntries(row.map((h, i) => [h, i])); continue; }
    if (row.length < 60) continue;
    sourceRows++;
    const g = k => row[idx[k]];
    const tail = g('Tail_Number').trim();
    const date = g('FlightDate');
    const key = tail ? `tail:${tail}` : `flt:${g('Reporting_Airline')}:${g('Flight_Number_Reporting_Airline')}:${date}`;
    for (const side of ['Origin', 'Dest']) {
      const code = g(side);
      if (!airportInfo.has(code)) airportInfo.set(code, { city: g(`${side}CityName`).replace(/, [A-Z]{2}$/, ''), state: g(`${side}State`), stateName: g(`${side}StateName`) });
    }
    if (hash32(key) % 1000 >= SAMPLE_PER_MILLE) continue;
    const cancelled = Number(g('Cancelled')) === 1 ? 1 : 0;
    const diverted = Number(g('Diverted')) === 1 ? 1 : 0;
    const schedDep = clock(date, g('CRSDepTime'));
    // Arrival day: choose the offset that puts local arrival within ±12h of departure + scheduled elapsed time.
    const elapsed = int(g('CRSElapsedTime')) ?? 0;
    const depMin = minutesOfDay(g('CRSDepTime')), arrMin = minutesOfDay(g('CRSArrTime'));
    let best = 0, bestGap = Infinity;
    for (const k of [-1, 0, 1, 2]) { const gap = Math.abs(arrMin + 1440 * k - (depMin + elapsed)); if (gap < bestGap) { bestGap = gap; best = k; } }
    const schedArr = addMinutes(`${date} 00:00`, arrMin + 1440 * best);
    const depDelay = int(g('DepDelay')), arrDelay = int(g('ArrDelay'));
    const causes = ['CarrierDelay', 'WeatherDelay', 'NASDelay', 'SecurityDelay', 'LateAircraftDelay'].map(k => int(g(k)));
    flights.push([
      date, g('Reporting_Airline'), Number(g('Flight_Number_Reporting_Airline')), tail || null, g('Origin'), g('Dest'),
      schedDep, cancelled || depDelay === null ? null : addMinutes(schedDep, depDelay), cancelled ? null : depDelay,
      int(g('TaxiOut')),
      schedArr, arrDelay === null ? null : addMinutes(schedArr, arrDelay), arrDelay,
      int(g('AirTime')), int(g('Distance')), cancelled, g('CancellationCode') || null, diverted, ...causes,
    ]);
  }
  console.log(`${name}: running total ${flights.length} of ${sourceRows}`);
}
flights.sort((a, b) => (a[6] < b[6] ? -1 : a[6] > b[6] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[2] - b[2]));

const routes = new Map();
for (const f of flights) {
  const key = `${f[4]}-${f[5]}`;
  if (!routes.has(key)) routes.set(key, [f[4], f[5], f[14]]);
}
const routeList = [...routes.values()].sort((a, b) => (a[0] + a[1] < b[0] + b[1] ? -1 : 1));
const routeId = new Map(routeList.map((r, i) => [`${r[0]}-${r[1]}`, i + 1]));
const flightRows = flights.map((f, i) => [i + 1, f[0], f[1], f[2], f[3], f[4], f[5], routeId.get(`${f[4]}-${f[5]}`), ...f.slice(6)]);

// Airports: every airport in the sampled flights, with OurAirports name and coordinates.
const used = new Set(flights.flatMap(f => [f[4], f[5]]));
const ourAirports = new Map();
{
  const { sha } = verify('ourairports-airports.csv');
  shas['ourairports-airports.csv'] = sha;
  let header = null, idx = null;
  for (const row of csvRows(fs.readFileSync(path.join(dir, 'ourairports-airports.csv'), 'utf8'))) {
    if (!header) { header = row; idx = Object.fromEntries(row.map((h, i) => [h, i])); continue; }
    const iata = row[idx.iata_code];
    if (!iata || !used.has(iata)) continue;
    const prev = ourAirports.get(iata);
    // Prefer the scheduled-service airport when an IATA code is reused.
    if (!prev || (row[idx.scheduled_service] === 'yes' && prev.scheduled !== 'yes')) {
      ourAirports.set(iata, { name: row[idx.name], lat: Number(row[idx.latitude_deg]), lon: Number(row[idx.longitude_deg]), elev: row[idx.elevation_ft] === '' ? null : Number(row[idx.elevation_ft]), scheduled: row[idx.scheduled_service] });
    }
  }
}
const airports = [...used].sort().map(code => {
  const b = airportInfo.get(code), o = ourAirports.get(code);
  return [code, o?.name ?? null, b.city, b.state, b.stateName, o ? Math.round(o.lat * 1e4) / 1e4 : null, o ? Math.round(o.lon * 1e4) / 1e4 : null, o?.elev ?? null];
});

const out = path.join(path.dirname(new URL(import.meta.url).pathname), '../flights/extract');
writeExtract(path.join(out, 'flights.tsv.gz'), ['flight_id', 'flight_date', 'airline_code', 'flight_number', 'tail_number', 'origin', 'destination', 'route_id', 'scheduled_departure', 'actual_departure', 'departure_delay', 'taxi_out_minutes', 'scheduled_arrival', 'actual_arrival', 'arrival_delay', 'air_time_minutes', 'distance_miles', 'cancelled', 'cancellation_code', 'diverted', 'carrier_delay', 'weather_delay', 'nas_delay', 'security_delay', 'late_aircraft_delay'], flightRows);
writeExtract(path.join(out, 'airports.tsv.gz'), ['airport_code', 'airport_name', 'city', 'state', 'state_name', 'latitude', 'longitude', 'elevation_ft'], airports);
writeExtract(path.join(out, 'routes.tsv.gz'), ['route_id', 'origin', 'destination', 'distance_miles'], routeList.map((r, i) => [i + 1, ...r]));
fs.writeFileSync(path.join(out, '../source.json'), JSON.stringify({ files: shas, sourceRows, samplePerMille: SAMPLE_PER_MILLE, window: ['2025-01-01', '2025-03-31'], extracted: { flights: flightRows.length, airports: airports.length, routes: routeList.length } }, null, 2) + '\n');
console.log({ sourceRows, flights: flightRows.length, airports: airports.length, routes: routeList.length, missingNames: airports.filter(a => !a[1]).map(a => a[0]) });
