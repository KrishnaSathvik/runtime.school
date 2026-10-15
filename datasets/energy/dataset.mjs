import path from 'node:path';
import { col, fk, table } from '../lib/schema.mjs';
import { readExtract } from '../lib/extract.mjs';
import { distinct, nulls } from '../lib/contract.mjs';

const FUEL_TYPES = [
  ['COL', 'Coal', 0, 1, 0], ['NG', 'Natural gas', 0, 1, 0], ['NUC', 'Nuclear', 0, 0, 0], ['OIL', 'Petroleum', 0, 1, 0],
  ['WAT', 'Hydropower and pumped storage', 1, 0, 0], ['SUN', 'Solar', 1, 0, 1], ['WND', 'Wind', 1, 0, 1], ['OTH', 'Other', 0, 0, 0], ['UNK', 'Unknown', 0, 0, 0],
];
/** Country and North American interconnection of each EIA-930 region. */
const REGION_GRID = {
  CAL: ['US', 'Western'], NW: ['US', 'Western'], SW: ['US', 'Western'], TEX: ['US', 'ERCOT'],
  CAR: ['US', 'Eastern'], CENT: ['US', 'Eastern'], FLA: ['US', 'Eastern'], MIDA: ['US', 'Eastern'], MIDW: ['US', 'Eastern'],
  NE: ['US', 'Eastern'], NY: ['US', 'Eastern'], SE: ['US', 'Eastern'], TEN: ['US', 'Eastern'], CAN: ['CA', null], MEX: ['MX', null],
};
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOLIDAYS = { '2024-01-01': "New Year's Day", '2024-01-15': 'Martin Luther King Jr. Day', '2024-02-19': "Washington's Birthday", '2024-05-27': 'Memorial Day', '2024-06-19': 'Juneteenth' };

const tables = [
  table('regions', 'One power-grid region or neighbouring country.', [
    col('region_code', 'TEXT', 'Region code (CAN and MEX for neighbouring countries)'),
    col('region_name', 'TEXT', 'Region name'),
    col('country', 'TEXT', 'ISO country code: US, CA or MX'),
    col('interconnection', 'TEXT', 'U.S. interconnection: Eastern, Western or ERCOT; NULL outside the U.S.', true),
  ]),
  table('balancing_authorities', 'One grid operator (balancing authority). Twelve have hourly detail; the rest appear only as interchange partners.', [
    col('ba_code', 'TEXT', 'Grid operator code'),
    col('ba_name', 'TEXT', 'Balancing authority name'),
    col('time_zone', 'TEXT', 'Reporting time zone (Eastern, Central, Mountain, Arizona, Pacific)'),
    col('region_code', 'TEXT', 'Region'),
    col('generation_only', 'INTEGER', '1 for generation-only BAs with no load'),
    col('hourly_detail', 'INTEGER', '1 for the twelve BAs whose hourly demand and generation are included'),
  ], { foreignKeys: [fk('region_code', 'regions')] }),
  table('fuel_types', 'One energy source used for generation (for example coal, natural gas, or wind).', [
    col('fuel_code', 'TEXT', 'Fuel code'),
    col('fuel_name', 'TEXT', 'Fuel name'),
    col('is_renewable', 'INTEGER', '1 for hydro, solar and wind'),
    col('is_fossil', 'INTEGER', '1 for coal, natural gas and petroleum'),
    col('is_variable', 'INTEGER', '1 for weather-dependent sources (solar, wind)'),
  ]),
  table('calendar', 'One calendar date, January–June 2024.', [
    col('date', 'TEXT', 'Calendar date (YYYY-MM-DD)'),
    col('month', 'INTEGER', 'Month number'),
    col('day_of_week', 'INTEGER', '0 = Sunday … 6 = Saturday'),
    col('is_weekend', 'INTEGER', '1 on Saturday and Sunday'),
    col('holiday_name', 'TEXT', 'U.S. federal holiday, NULL otherwise', true),
    col('day_of_month', 'INTEGER', 'Day of the month, 1–31'),
    col('day_name', 'TEXT', 'Sunday … Saturday'),
  ]),
  table('hourly_demand', 'One hour for one grid operator: electricity demand and the day-ahead forecast.', [
    col('ba_code', 'TEXT', 'Balancing authority'),
    col('hour_ending_utc', 'TEXT', 'End of the hour in UTC (YYYY-MM-DD HH:MM)'),
    col('hour_ending_local', 'TEXT', 'End of the hour in the BA’s local time; repeats or skips at daylight-saving changes'),
    col('demand_mw', 'INTEGER', 'Reported demand in MW (= MWh over the hour); NULL when not reported', true),
    col('forecast_mw', 'INTEGER', 'Day-ahead demand forecast in MW; NULL when not reported', true),
    col('local_date', 'TEXT', 'The BA’s local operating date the hour belongs to (YYYY-MM-DD)'),
    col('hour_number', 'INTEGER', 'Hour of the local operating day, 1–24 (23 or 25 hours on daylight-saving change days)'),
    col('adjusted_demand_mw', 'INTEGER', 'Cleaned demand with anomalies replaced; NULL when unavailable', true),
    col('demand_imputed', 'INTEGER', '1 if this hour’s demand was filled in'),
  ], { primaryKey: ['ba_code', 'hour_ending_utc'], foreignKeys: [fk('ba_code', 'balancing_authorities'), fk('local_date', 'calendar', 'date')], indexes: [['hour_ending_utc']] }),
  table('generation', 'One hour for one grid operator: power generated, power traded with neighbours, and generation by fuel.', [
    col('ba_code', 'TEXT', 'Balancing authority'),
    col('hour_ending_utc', 'TEXT', 'End of the hour in UTC'),
    col('net_generation_mw', 'INTEGER', 'Net generation in MW; NULL when not reported', true),
    col('total_interchange_mw', 'INTEGER', 'Net flow out of the BA in MW (positive = exporting); NULL when not reported', true),
    col('adjusted_net_generation_mw', 'INTEGER', 'Cleaned net generation; NULL when unavailable', true),
    col('adjusted_total_interchange_mw', 'INTEGER', 'Cleaned total interchange; NULL when unavailable', true),
    col('coal_mw', 'INTEGER', 'Net generation from coal; NULL when not reported', true),
    col('natural_gas_mw', 'INTEGER', 'Net generation from natural gas; NULL when not reported', true),
    col('nuclear_mw', 'INTEGER', 'Net generation from nuclear; NULL when not reported', true),
    col('petroleum_mw', 'INTEGER', 'Net generation from petroleum products; NULL when not reported', true),
    col('hydro_mw', 'INTEGER', 'Net generation from hydropower and pumped storage (negative while pumping); NULL when not reported', true),
    col('solar_mw', 'INTEGER', 'Net generation from solar; NULL when not reported', true),
    col('wind_mw', 'INTEGER', 'Net generation from wind; NULL when not reported', true),
    col('other_mw', 'INTEGER', 'Net generation from other sources; NULL when not reported', true),
    col('unknown_mw', 'INTEGER', 'Net generation from unknown sources; NULL when not reported', true),
  ], { primaryKey: ['ba_code', 'hour_ending_utc'], foreignKeys: [fk('ba_code', 'balancing_authorities')], indexes: [['hour_ending_utc']] }),
  table('generation_by_fuel', 'One day for one grid operator and one fuel: total generation that day.', [
    col('ba_code', 'TEXT', 'Balancing authority'),
    col('date', 'TEXT', 'Local calendar date of the BA'),
    col('fuel_code', 'TEXT', 'Energy source'),
    col('generation_mwh', 'INTEGER', 'Sum of reported hourly MW, i.e. MWh; can be negative (pumping, station use)'),
    col('hours_reported', 'INTEGER', 'Hours with a reported value (23 or 25 on daylight-saving days)'),
  ], { primaryKey: ['ba_code', 'date', 'fuel_code'], foreignKeys: [fk('ba_code', 'balancing_authorities'), fk('fuel_code', 'fuel_types'), fk('date', 'calendar')] , indexes: [['date']] }),
  table('interchange', 'One day of scheduled power flow from one grid operator to another.', [
    col('from_ba', 'TEXT', 'Reporting balancing authority'),
    col('to_ba', 'TEXT', 'Directly interconnected balancing authority'),
    col('date', 'TEXT', 'Local calendar date of from_ba'),
    col('interchange_mwh', 'INTEGER', 'Positive = flow from from_ba to to_ba; NULL when no hour was reported', true),
    col('hours_reported', 'INTEGER', 'Hours with a reported value'),
  ], { primaryKey: ['from_ba', 'to_ba', 'date'], foreignKeys: [fk('from_ba', 'balancing_authorities', 'ba_code'), fk('to_ba', 'balancing_authorities', 'ba_code'), fk('date', 'calendar')] }),
];

async function rows({ dir }) {
  const ex = (name, numeric) => readExtract(path.join(dir, 'extract', `${name}.tsv.gz`), numeric).rows;
  const calendar = [];
  for (let t = Date.UTC(2024, 0, 1); t < Date.UTC(2024, 6, 1); t += 86400000) {
    const d = new Date(t), date = d.toISOString().slice(0, 10), w = d.getUTCDay();
    calendar.push([date, d.getUTCMonth() + 1, w, w === 0 || w === 6 ? 1 : 0, HOLIDAYS[date] ?? null, d.getUTCDate(), DAY_NAMES[w]]);
  }
  return {
    regions: ex('regions', []).map(([code, name]) => [code, name, ...REGION_GRID[code]]),
    balancing_authorities: ex('balancing_authorities', ['generation_only', 'hourly_detail']),
    fuel_types: FUEL_TYPES,
    calendar,
    hourly_demand: ex('hourly_demand', ['demand_mw', 'forecast_mw', 'hour_number', 'adjusted_demand_mw', 'demand_imputed']),
    generation: ex('generation', ['net_generation_mw', 'total_interchange_mw', 'adjusted_net_generation_mw', 'adjusted_total_interchange_mw', 'coal_mw', 'natural_gas_mw', 'nuclear_mw', 'petroleum_mw', 'hydro_mw', 'solar_mw', 'wind_mw', 'other_mw', 'unknown_mw']),
    generation_by_fuel: ex('generation_by_fuel', ['generation_mwh', 'hours_reported']),
    interchange: ex('interchange', ['interchange_mwh', 'hours_reported']),
  };
}

const dataset = {
  id: 'energy',
  version: '3.0.0',
  name: 'Energy',
  domain: 'Electric grid',
  kind: 'real',
  description: 'Hourly electricity demand, forecasts, generation and interchange for twelve major U.S. balancing authorities, January–June 2024, with daily fuel mix and flows between neighbouring grids.',
  source: {
    publisher: 'U.S. Energy Information Administration (EIA)',
    url: 'https://www.eia.gov/electricity/gridmonitor/',
    release: 'EIA-930 Hourly Electric Grid Monitor six-month files, 2024 January–June; EIA-930 reference tables',
    license: 'U.S. government work (public domain)',
    licenseUrl: 'https://www.eia.gov/about/copyrights_reuse.php',
    commercialReuse: 'permitted',
    attribution: 'Source: U.S. Energy Information Administration, Form EIA-930 Hourly Electric Grid Monitor. Modified by Runtime.',
    retrieved: '2026-10-14',
    transformations: [
      'Twelve balancing authorities kept at hourly grain: BPAT, CISO, DUK, ERCO, FPL, ISNE, MISO, NYIS, PJM, SOCO, SWPP, TVA.',
      'As-reported values only; EIA imputed and adjusted series are omitted, so missing hours stay NULL.',
      'Fuel mix and BA-to-BA interchange summed to the reporting BA’s local date, with hours_reported.',
      'Timestamps converted from M/D/YYYY h:mm AM/PM to ISO-style text.',
    ],
  },
  reproduction: { command: 'node datasets/acquire/download.mjs <dir> energy && node datasets/acquire/energy.mjs <dir> && node datasets/build.mjs energy', implementation: 'datasets/acquire/energy.mjs, datasets/energy/dataset.mjs', notes: 'Committed extracts in datasets/energy/extract are the build input.' },
  coverage: { start: '2024-01-01', end: '2024-06-30', grain: 'balancing authority hour' },
  tables,
  edgeCases: [
    'Missing demand, forecast and interchange hours (NULL)',
    'Daylight-saving days with 23 or 25 local hours',
    'Negative net generation for pumped storage and station use',
    'Interchange reported by one side only; partners outside the twelve hourly BAs',
    'Canadian and Mexican interchange partners',
    'Generation-only balancing authorities',
  ],
  qualityNotes: [
    'MW over one hour equals MWh; daily totals are sums of hourly MW.',
    'Demand ≈ net generation − total interchange; reported values do not always balance.',
    'Local hours repeat or skip at daylight-saving changes; use hour_ending_utc for ordering.',
  ],
  concepts: ['hourly time series', 'rolling windows', 'share of total', 'forecast error', 'partitioning', 'date series'],
  rows,
  mutation: `
UPDATE hourly_demand SET demand_mw = demand_mw + 750 WHERE ba_code = 'ERCO' AND hour_ending_utc >= '2024-03-01' AND hour_ending_utc < '2024-03-08';
UPDATE hourly_demand SET demand_mw = NULL WHERE ba_code = 'NYIS' AND hour_ending_utc IN ('2024-02-10 15:00', '2024-02-10 16:00');
UPDATE generation_by_fuel SET generation_mwh = generation_mwh + 5000 WHERE fuel_code = 'WND' AND date >= '2024-04-01' AND date < '2024-04-15';
DELETE FROM generation WHERE ba_code = 'FPL' AND hour_ending_utc >= '2024-05-01' AND hour_ending_utc < '2024-05-02';
UPDATE interchange SET interchange_mwh = -interchange_mwh WHERE from_ba = 'PJM' AND date = '2024-01-15';
UPDATE generation_by_fuel SET generation_mwh = generation_mwh + 2500 WHERE fuel_code = 'SUN' AND date = '2024-04-15';
UPDATE hourly_demand SET demand_mw = demand_mw - 400 WHERE ba_code = 'ERCO' AND hour_ending_utc >= '2024-01-20' AND hour_ending_utc < '2024-01-21';
`,
  contract: {
    totalRows: [90000, 150000],
    minRows: { hourly_demand: 50000, generation: 50000, generation_by_fuel: 12000, interchange: 10000, balancing_authorities: 40, calendar: 180, fuel_types: 9, regions: 10 },
    checks: [
      { name: 'BAs with hourly detail', sql: distinct('hourly_demand', 'ba_code'), equals: 12 },
      { name: 'hours per BA (min)', sql: 'SELECT MIN(n) FROM (SELECT COUNT(*) AS n FROM hourly_demand GROUP BY ba_code)', min: 4300 },
      { name: 'missing demand hours', sql: nulls('hourly_demand', 'demand_mw'), min: 10 },
      { name: 'missing interchange hours', sql: nulls('generation', 'total_interchange_mw'), min: 10 },
      { name: 'daylight-saving short days', sql: "SELECT COUNT(*) FROM generation_by_fuel WHERE date = '2024-03-10' AND hours_reported = 23", min: 5 },
      { name: 'negative fuel totals', sql: 'SELECT COUNT(*) FROM generation_by_fuel WHERE generation_mwh < 0', min: 50 },
      { name: 'fuels used', sql: distinct('generation_by_fuel', 'fuel_code'), min: 8 },
      { name: 'interchange partners outside the twelve', sql: "SELECT COUNT(DISTINCT to_ba) FROM interchange WHERE to_ba NOT IN (SELECT ba_code FROM balancing_authorities WHERE hourly_detail = 1)", min: 20 },
      { name: 'imputed demand hours', sql: 'SELECT SUM(demand_imputed) FROM hourly_demand', min: 20 },
      { name: 'spring-forward local days with 23 hours', sql: "SELECT COUNT(*) FROM (SELECT ba_code, local_date FROM hourly_demand GROUP BY ba_code, local_date HAVING COUNT(*) = 23)", min: 8 },
      { name: 'hours with solar generation', sql: 'SELECT COUNT(*) FROM generation WHERE solar_mw > 0', min: 10000 },
      { name: 'regions in use', sql: distinct('balancing_authorities', 'region_code'), min: 10 },
    ],
  },
};

export default dataset;
