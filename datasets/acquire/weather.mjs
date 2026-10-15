/**
 * Weather extract from NOAA NCEI GHCN-Daily (U.S. government work, public domain), 2022–2024.
 *   node datasets/acquire/weather.mjs <downloads-dir>
 *
 * Selection: for each listed city (coordinates from the 2023 Census Gazetteer), the nearest
 * first-order weather station (USW…) within 60 km that reports TMAX, TMIN and PRCP for the whole
 * period; extra stations are added for multi-airport metros. Daily values come from the NCEI
 * access API in metric units. Values failing NOAA quality control (non-empty quality flag) are
 * written as NULL (TAVG is not requested: these stations do not publish it); trace precipitation is kept as 0 mm with precip_trace = 1.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { unzipSync, strFromU8 } from 'fflate';
import { csvRows } from './csv.mjs';
import { writeExtract } from '../lib/extract.mjs';

const START = '2022-01-01', END = '2024-12-31';
const CITIES = [
  ['AL', 'Birmingham'], ['AL', 'Mobile'], ['AK', 'Anchorage'], ['AK', 'Fairbanks'], ['AZ', 'Phoenix'], ['AZ', 'Tucson'], ['AR', 'Little Rock'],
  ['CA', 'Los Angeles'], ['CA', 'San Francisco'], ['CA', 'San Diego'], ['CA', 'Sacramento'], ['CA', 'Fresno'], ['CO', 'Denver'], ['CO', 'Colorado Springs'],
  ['CT', 'Hartford'], ['DE', 'Wilmington'], ['DC', 'Washington'], ['FL', 'Miami'], ['FL', 'Orlando'], ['FL', 'Tampa'], ['FL', 'Jacksonville'], ['FL', 'Tallahassee'],
  ['GA', 'Atlanta'], ['GA', 'Savannah'], ['HI', 'Honolulu'], ['ID', 'Boise City'], ['IL', 'Chicago'], ['IL', 'Peoria'], ['IN', 'Indianapolis'], ['IN', 'Fort Wayne'],
  ['IA', 'Des Moines'], ['KS', 'Wichita'], ['KY', 'Louisville'], ['LA', 'New Orleans'], ['LA', 'Shreveport'], ['ME', 'Portland'], ['MD', 'Baltimore'],
  ['MA', 'Boston'], ['MI', 'Detroit'], ['MI', 'Grand Rapids'], ['MN', 'Minneapolis'], ['MN', 'Duluth'], ['MS', 'Jackson'], ['MO', 'Kansas City'], ['MO', 'St. Louis'],
  ['MT', 'Billings'], ['MT', 'Great Falls'], ['NE', 'Omaha'], ['NE', 'Lincoln'], ['NV', 'Las Vegas'], ['NV', 'Reno'], ['NH', 'Concord'], ['NJ', 'Newark'],
  ['NM', 'Albuquerque'], ['NY', 'New York'], ['NY', 'Buffalo'], ['NY', 'Albany'], ['NY', 'Syracuse'], ['NC', 'Charlotte'], ['NC', 'Raleigh'], ['ND', 'Bismarck'], ['ND', 'Fargo'],
  ['OH', 'Columbus'], ['OH', 'Cleveland'], ['OH', 'Cincinnati'], ['OK', 'Oklahoma City'], ['OK', 'Tulsa'], ['OR', 'Portland'], ['OR', 'Medford'], ['PA', 'Philadelphia'], ['PA', 'Pittsburgh'],
  ['RI', 'Providence'], ['SC', 'Charleston'], ['SC', 'Columbia'], ['SD', 'Sioux Falls'], ['SD', 'Rapid City'], ['TN', 'Nashville'], ['TN', 'Memphis'], ['TN', 'Knoxville'],
  ['TX', 'Houston'], ['TX', 'Dallas'], ['TX', 'Austin'], ['TX', 'San Antonio'], ['TX', 'El Paso'], ['TX', 'Amarillo'], ['UT', 'Salt Lake City'], ['VT', 'Burlington'],
  ['VA', 'Richmond'], ['VA', 'Norfolk'], ['WA', 'Seattle'], ['WA', 'Spokane'], ['WV', 'Charleston'], ['WI', 'Milwaukee'], ['WI', 'Madison'], ['WY', 'Cheyenne'], ['WY', 'Casper'],
];
/** Gazetteer places whose names do not start with the common city name. */
const GAZ_NAME = { 'HI|Honolulu': 'Urban Honolulu' };
/** Additional first-order stations for metros with several airports. */
const EXTRA_STATIONS = { 'NY|New York': ['USW00094789', 'USW00014732'], 'IL|Chicago': ['USW00014819'], 'TX|Houston': ['USW00012918'], 'TX|Dallas': ['USW00013960'], 'DC|Washington': ['USW00093738'], 'CA|San Francisco': ['USW00023234'] };

const dir = process.argv[2];
if (!dir) throw new Error('Usage: node datasets/acquire/weather.mjs <downloads-dir>');
const shas = {};
const read = name => { const b = fs.readFileSync(path.join(dir, name)); shas[name] = createHash('sha256').update(b).digest('hex'); return b; };

const places = strFromU8(unzipSync(read('gaz-places.zip'))['2023_Gaz_place_national.txt']).split('\n').slice(1).map(l => l.split('\t')).filter(r => r.length > 11)
  .map(r => ({ state: r[0], name: r[3], area: Number(r[8]), lat: Number(r[10]), lon: Number(r[11]) }));
const stations = new Map();
for (const line of read('ghcnd-stations.txt').toString('utf8').split('\n')) {
  const id = line.slice(0, 11);
  if (!id.startsWith('USW')) continue;
  stations.set(id, { id, lat: Number(line.slice(12, 20)), lon: Number(line.slice(21, 30)), elev: Number(line.slice(31, 37)), state: line.slice(38, 40).trim(), name: line.slice(41, 71).trim() });
}
const coverage = new Map();
for (const line of read('ghcnd-inventory.txt').toString('utf8').split('\n')) {
  const id = line.slice(0, 11);
  if (!stations.has(id)) continue;
  const el = line.slice(31, 35), first = Number(line.slice(36, 40)), last = Number(line.slice(41, 45));
  if (['TMAX', 'TMIN', 'PRCP'].includes(el) && first <= 2021 && last >= 2025) (coverage.get(id) ?? coverage.set(id, new Set()).get(id)).add(el);
}
const km = (a, b) => {
  const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cities = [], chosen = [];
for (const [state, city] of CITIES) {
  const target = GAZ_NAME[`${state}|${city}`] ?? city;
  const re = new RegExp(`^${escapeRe(target)}(\\s|-|/|$)`);
  const match = places.filter(p => p.state === state && re.test(p.name)).sort((a, b) => b.area - a.area)[0];
  if (!match) throw new Error(`No gazetteer place for ${city}, ${state}`);
  const cityId = cities.length + 1;
  cities.push([cityId, city === 'Boise City' ? 'Boise' : city, state, match.lat, match.lon, match.area]);
  const candidates = [...stations.values()].filter(s => coverage.get(s.id)?.size === 3).map(s => ({ s, d: km(s, match) })).filter(x => x.d <= 60).sort((a, b) => a.d - b.d);
  if (!candidates.length) throw new Error(`No first-order station within 60 km of ${city}, ${state}`);
  const ids = [candidates[0].s.id, ...(EXTRA_STATIONS[`${state}|${city}`] ?? [])];
  for (const id of ids) if (!chosen.some(c => c.id === id)) chosen.push({ id, cityId, primary: id === ids[0] ? 1 : 0 });
}

const daily = [];
const ELEMENTS = ['TMAX', 'TMIN', 'PRCP', 'SNOW', 'SNWD', 'AWND', 'WSF2']; // TAVG is not published for these stations in 2022–2024
for (const c of chosen) {
  const url = `https://www.ncei.noaa.gov/access/services/data/v1?dataset=daily-summaries&stations=${c.id}&startDate=${START}&endDate=${END}&dataTypes=${ELEMENTS.join(',')}&units=metric&includeAttributes=true&format=csv`;
  let text = null;
  for (let attempt = 1; attempt <= 4 && text === null; attempt++) {
    const res = await fetch(url);
    if (res.ok) text = await res.text(); else await new Promise(r => setTimeout(r, 2000 * attempt));
  }
  if (text === null) throw new Error(`Failed to fetch ${c.id}`);
  let idx = null, n = 0;
  for (const row of csvRows(text)) {
    if (!idx) { idx = Object.fromEntries(row.map((h, i) => [h, i])); continue; }
    if (row.length < 3) continue;
    const value = el => {
      if (idx[el] === undefined || row[idx[el]] === '') return null;
      const flags = (row[idx[`${el}_ATTRIBUTES`]] ?? '').split(',');
      if (flags[1]) return null; // failed NOAA quality control
      return Number(row[idx[el]]);
    };
    const trace = idx.PRCP !== undefined && (row[idx.PRCP_ATTRIBUTES] ?? '').split(',')[0] === 'T' ? 1 : 0;
    daily.push([c.id, row[idx.DATE], value('TMAX'), value('TMIN'), value('PRCP'), trace, value('SNOW'), value('SNWD'), value('AWND'), value('WSF2')]);
    n++;
  }
  const s = stations.get(c.id);
  console.log(`${c.id} ${s.name}: ${n} days`);
  c.meta = s;
}
daily.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1));
const title = name => name.toLowerCase().replace(/\b[a-z]/g, ch => ch.toUpperCase()).replace(/\bAp\b/, 'Airport').replace(/\bIntl\b/, 'International');
const stationRows = chosen.map(c => [c.id, title(c.meta.name), c.cityId, c.primary, c.meta.lat, c.meta.lon, c.meta.elev]).sort((a, b) => (a[0] < b[0] ? -1 : 1));

const out = path.join(path.dirname(new URL(import.meta.url).pathname), '../weather/extract');
writeExtract(path.join(out, 'cities.tsv.gz'), ['city_id', 'city_name', 'state_code', 'latitude', 'longitude', 'land_area_sq_mi'], cities);
writeExtract(path.join(out, 'stations.tsv.gz'), ['station_id', 'station_name', 'city_id', 'is_primary', 'latitude', 'longitude', 'elevation_m'], stationRows);
writeExtract(path.join(out, 'daily_weather.tsv.gz'), ['station_id', 'observation_date', 'tmax_c', 'tmin_c', 'precipitation_mm', 'precip_trace', 'snowfall_mm', 'snow_depth_mm', 'avg_wind_speed_ms', 'peak_gust_ms'], daily);
fs.writeFileSync(path.join(out, '../source.json'), JSON.stringify({ files: shas, api: 'https://www.ncei.noaa.gov/access/services/data/v1 (dataset=daily-summaries, units=metric)', window: [START, END], retrieved: new Date().toISOString().slice(0, 10), extracted: { cities: cities.length, stations: stationRows.length, daily_weather: daily.length } }, null, 2) + '\n');
console.log({ cities: cities.length, stations: stationRows.length, daily: daily.length });
