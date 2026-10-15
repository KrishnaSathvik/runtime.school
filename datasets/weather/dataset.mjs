import path from 'node:path';
import { col, fk, table } from '../lib/schema.mjs';
import { readExtract } from '../lib/extract.mjs';
import { distinct, nulls } from '../lib/contract.mjs';

const STATES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine',
  MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
  NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon',
  PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
};
/** U.S. Census Bureau regions and divisions. */
const DIVISIONS = {
  'Northeast|New England': ['CT', 'ME', 'MA', 'NH', 'RI', 'VT'], 'Northeast|Middle Atlantic': ['NJ', 'NY', 'PA'],
  'Midwest|East North Central': ['IL', 'IN', 'MI', 'OH', 'WI'], 'Midwest|West North Central': ['IA', 'KS', 'MN', 'MO', 'NE', 'ND', 'SD'],
  'South|South Atlantic': ['DE', 'DC', 'FL', 'GA', 'MD', 'NC', 'SC', 'VA', 'WV'], 'South|East South Central': ['AL', 'KY', 'MS', 'TN'], 'South|West South Central': ['AR', 'LA', 'OK', 'TX'],
  'West|Mountain': ['AZ', 'CO', 'ID', 'MT', 'NV', 'NM', 'UT', 'WY'], 'West|Pacific': ['AK', 'CA', 'HI', 'OR', 'WA'],
};
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SEASONS = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];

const tables = [
  table('states', 'One U.S. state or the District of Columbia.', [
    col('state_code', 'TEXT', 'USPS state code'),
    col('state_name', 'TEXT', 'State name'),
    col('census_region', 'TEXT', 'Northeast, Midwest, South or West'),
    col('census_division', 'TEXT', 'U.S. region division'),
  ]),
  table('cities', 'One city with weather coverage, including its map location.', [
    col('city_id', 'INTEGER', 'City key'),
    col('city_name', 'TEXT', 'City name'),
    col('state_code', 'TEXT', 'State'),
    col('latitude', 'REAL', 'City latitude'),
    col('longitude', 'REAL', 'City longitude'),
    col('land_area_sq_mi', 'REAL', 'Land area of the incorporated place, square miles'),
  ], { foreignKeys: [fk('state_code', 'states')] }),
  table('stations', 'One weather station (usually at an airport). A city can have more than one station.', [
    col('station_id', 'TEXT', 'Weather station ID'),
    col('station_name', 'TEXT', 'Station name'),
    col('city_id', 'INTEGER', 'City the station represents'),
    col('is_primary', 'INTEGER', '1 for the station nearest the city’s internal point'),
    col('latitude', 'REAL', 'Latitude'),
    col('longitude', 'REAL', 'Longitude'),
    col('elevation_m', 'REAL', 'Elevation in metres'),
    col('first_observation', 'TEXT', 'Earliest observation date in this dataset', true),
    col('last_observation', 'TEXT', 'Latest observation date in this dataset', true),
    col('reported_days', 'INTEGER', 'Days with at least one reported measurement'),
  ], { foreignKeys: [fk('city_id', 'cities')] }),
  table('calendar', 'One calendar date, 2022–2024.', [
    col('date', 'TEXT', 'Calendar date (YYYY-MM-DD)'),
    col('year', 'INTEGER', 'Year'),
    col('month', 'INTEGER', 'Month number'),
    col('day_of_year', 'INTEGER', 'Day of the year, 1–366'),
    col('day_of_week', 'INTEGER', '0 = Sunday … 6 = Saturday'),
    col('meteorological_season', 'TEXT', 'winter (Dec–Feb), spring, summer or autumn'),
    col('day_of_month', 'INTEGER', 'Day of the month, 1–31'),
    col('day_name', 'TEXT', 'Sunday … Saturday'),
    col('is_weekend', 'INTEGER', '1 for Saturday or Sunday'),
    col('quarter', 'INTEGER', 'Calendar quarter, 1–4'),
  ]),
  table('daily_weather', 'One day of weather for one station. If a station did not report that day, there is no row.', [
    col('station_id', 'TEXT', 'Station'),
    col('observation_date', 'TEXT', 'Local observation date'),
    col('tmax_c', 'REAL', 'Maximum temperature, °C', true),
    col('tmin_c', 'REAL', 'Minimum temperature, °C', true),
    col('precipitation_mm', 'REAL', 'Precipitation, mm; 0 with precip_trace = 1 means a trace', true),
    col('precip_trace', 'INTEGER', '1 when precipitation was a trace (too small to measure)'),
    col('snowfall_mm', 'REAL', 'Snowfall, mm', true),
    col('snow_depth_mm', 'REAL', 'Snow depth on the ground, mm', true),
    col('avg_wind_speed_ms', 'REAL', 'Average wind speed, m/s', true),
    col('peak_gust_ms', 'REAL', 'Fastest 2-minute wind speed, m/s', true),
  ], { primaryKey: ['station_id', 'observation_date'], foreignKeys: [fk('station_id', 'stations'), fk('observation_date', 'calendar', 'date')], indexes: [['observation_date']] }),
];

async function rows({ dir }) {
  const ex = (name, numeric) => readExtract(path.join(dir, 'extract', `${name}.tsv.gz`), numeric).rows;
  const divisionOf = {};
  for (const [key, codes] of Object.entries(DIVISIONS)) for (const c of codes) divisionOf[c] = key.split('|');
  const states = Object.entries(STATES).map(([code, name]) => [code, name, ...divisionOf[code]]);
  const calendar = [];
  for (let t = Date.UTC(2022, 0, 1); t < Date.UTC(2025, 0, 1); t += 86400000) {
    const d = new Date(t), y = d.getUTCFullYear();
    const dow = d.getUTCDay();
    calendar.push([d.toISOString().slice(0, 10), y, d.getUTCMonth() + 1, Math.round((t - Date.UTC(y, 0, 1)) / 86400000) + 1, dow, SEASONS[d.getUTCMonth()],
      d.getUTCDate(), DAY_NAMES[dow], dow === 0 || dow === 6 ? 1 : 0, Math.floor(d.getUTCMonth() / 3) + 1]);
  }
  const daily_weather = ex('daily_weather', ['tmax_c', 'tmin_c', 'precipitation_mm', 'precip_trace', 'snowfall_mm', 'snow_depth_mm', 'avg_wind_speed_ms', 'peak_gust_ms']);
  const span = new Map();
  for (const [station, date] of daily_weather) {
    const s = span.get(station) ?? { first: date, last: date, days: 0 };
    if (date < s.first) s.first = date;
    if (date > s.last) s.last = date;
    s.days++;
    span.set(station, s);
  }
  const stations = ex('stations', ['city_id', 'is_primary', 'latitude', 'longitude', 'elevation_m'])
    .map(row => { const s = span.get(row[0]); return [...row, s?.first ?? null, s?.last ?? null, s?.days ?? 0]; });
  return {
    states,
    cities: ex('cities', ['city_id', 'latitude', 'longitude', 'land_area_sq_mi']),
    stations,
    calendar,
    daily_weather,
  };
}

const dataset = {
  id: 'weather',
  version: '3.0.0',
  name: 'Weather',
  domain: 'Climate and weather',
  kind: 'real',
  description: 'Three years (2022–2024) of daily observations from 100 NOAA weather stations serving 96 U.S. cities: temperatures, rain, snow and wind.',
  source: {
    publisher: 'NOAA National Centers for Environmental Information (NCEI); U.S. Census Bureau',
    url: 'https://www.ncei.noaa.gov/products/land-based-station/global-historical-climatology-network-daily',
    release: 'GHCN-Daily via the NCEI Access Data Service (daily-summaries), retrieved 2026-10-14; 2023 Census Gazetteer places',
    license: 'U.S. government work (public domain)',
    licenseUrl: 'https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C00861',
    commercialReuse: 'permitted',
    attribution: 'Source: NOAA NCEI Global Historical Climatology Network – Daily (Menne et al., 2012). City coordinates: U.S. Census Bureau Gazetteer. Modified by Runtime.',
    retrieved: '2026-10-14',
    transformations: [
      'One first-order station nearest each listed city (within 60 km) with complete TMAX, TMIN and PRCP coverage; extra stations for multi-airport metros.',
      'Seven elements pivoted to one row per station-day, metric units (TAVG is not published for these stations).',
      'Values with a NOAA quality-control flag set to NULL; trace precipitation recorded as 0 mm with precip_trace = 1.',
      'Census regions and divisions, and a 2022–2024 calendar, added by Runtime.',
    ],
  },
  reproduction: { command: 'node datasets/acquire/download.mjs <dir> weather && node datasets/acquire/weather.mjs <dir> && node datasets/build.mjs weather', implementation: 'datasets/acquire/weather.mjs, datasets/weather/dataset.mjs', notes: 'The NCEI API serves revised values over time; the committed extract in datasets/weather/extract is the build input.' },
  coverage: { start: '2022-01-01', end: '2024-12-31', grain: 'station-day' },
  tables,
  edgeCases: [
    'Days with no row for a station (gaps in the date series)',
    'Measurements a station does not report at all (snow at southern stations)',
    'Trace precipitation (0 mm but not dry)',
    'Values removed by NOAA quality control',
    'Cities with several stations',
    'Leap day 2024-02-29',
    'Extremes: desert heat, Alaska cold, hurricane rainfall',
  ],
  qualityNotes: [
    'NULL means not reported or failed quality control; it is not zero.',
    'Stations represent airports or observation sites, not citywide averages.',
    'Three years are weather, not a climate trend.',
  ],
  concepts: ['MIN/MAX', 'CASE', 'CROSS JOIN date grids', 'rolling windows', 'histograms', 'date series', 'missing data'],
  rows,
  mutation: `
UPDATE daily_weather SET tmax_c = tmax_c + 5 WHERE observation_date >= '2023-07-01' AND observation_date < '2023-07-08';
UPDATE daily_weather SET tmax_c = NULL WHERE station_id = 'USW00094728' AND observation_date IN ('2024-01-03', '2024-01-04');
DELETE FROM daily_weather WHERE station_id = 'USW00023174' AND observation_date >= '2022-03-01' AND observation_date < '2022-03-04';
UPDATE daily_weather SET precipitation_mm = precipitation_mm + 40 WHERE station_id IN ('USW00012839', 'USW00013874') AND observation_date = '2024-08-05';
UPDATE daily_weather SET snowfall_mm = 150 WHERE station_id = 'USW00014733' AND observation_date = '2022-11-15';
INSERT INTO stations VALUES ('USW00099999', 'Runtime Test Station', 1, 0, 33.5, -86.8, 200, NULL, NULL, 0);
UPDATE stations SET longitude = -112.0 WHERE station_id = 'USW00099999';
UPDATE stations SET longitude = -99.5 WHERE station_id = (SELECT station_id FROM stations WHERE longitude < -100 ORDER BY longitude DESC LIMIT 1);
UPDATE daily_weather SET precipitation_mm = 0, precip_trace = 1 WHERE station_id = 'USW00094728' AND observation_date IN ('2023-05-02', '2023-05-03');
UPDATE daily_weather SET tmax_c = tmax_c - 3 WHERE station_id = 'USW00094728' AND observation_date >= '2024-01-10' AND observation_date < '2024-01-15';
INSERT INTO stations VALUES ('USW00099998', 'Runtime Harrisburg Probe', (SELECT city_id FROM cities WHERE city_name = 'Pittsburgh'), 0, 40.2, -76.8, 100, NULL, NULL, 0);
INSERT INTO daily_weather VALUES ('USW00099998', '2024-11-16', 11.1, 2.2, 0, 0, NULL, NULL, 3.1, 7.2);
`,
  contract: {
    totalRows: [75000, 125000],
    minRows: { states: 51, cities: 90, stations: 95, calendar: 1096, daily_weather: 100000 },
    checks: [
      { name: 'states covered', sql: distinct('cities', 'state_code'), equals: 51 },
      { name: 'station-days missing (gaps)', sql: "SELECT (SELECT COUNT(*) FROM stations) * 1096 - COUNT(*) FROM daily_weather", min: 100 },
      { name: 'stations reporting every day', sql: 'SELECT COUNT(*) FROM (SELECT station_id FROM daily_weather GROUP BY station_id HAVING COUNT(*) = 1096)', min: 20 },
      { name: 'missing snowfall measurements', sql: nulls('daily_weather', 'snowfall_mm'), min: 10000 },
      { name: 'trace precipitation days', sql: 'SELECT SUM(precip_trace) FROM daily_weather', min: 1000 },
      { name: 'quality-removed or missing tmax', sql: nulls('daily_weather', 'tmax_c'), min: 10 },
      { name: 'hottest tmax ≥ 45 °C', sql: 'SELECT MAX(tmax_c) FROM daily_weather', min: 45 },
      { name: 'coldest tmin ≤ −35 °C', sql: 'SELECT MIN(tmin_c) FROM daily_weather', max: -35 },
      { name: 'cities with multiple stations', sql: 'SELECT COUNT(*) FROM (SELECT city_id FROM stations GROUP BY city_id HAVING COUNT(*) > 1)', min: 3 },
    ],
  },
};

export default dataset;
