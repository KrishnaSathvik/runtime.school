import path from 'node:path';
import { col, fk, table } from '../lib/schema.mjs';
import { readExtract } from '../lib/extract.mjs';
import { maxShare, distinct, nulls } from '../lib/contract.mjs';

/** Code lists from the TLC Yellow Taxi data dictionary (March 2025 revision). */
const VENDORS = [[1, 'Creative Mobile Technologies'], [2, 'Curb Mobility'], [6, 'Myle Technologies'], [7, 'Helix']];
const PAYMENT_TYPES = [[0, 'Flex fare trip', 0], [1, 'Credit card', 1], [2, 'Cash', 0], [3, 'No charge', 0], [4, 'Dispute', 0], [5, 'Unknown', 0], [6, 'Voided trip', 0]];
const RATE_CODES = [[1, 'Standard rate'], [2, 'JFK'], [3, 'Newark'], [4, 'Nassau or Westchester'], [5, 'Negotiated fare'], [6, 'Group ride'], [99, 'Null/unknown']];
const HOLIDAYS = { '2025-01-01': "New Year's Day", '2025-01-20': 'Martin Luther King Jr. Day', '2025-02-17': "Washington's Birthday" };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const tables = [
  table('boroughs', 'One New York City borough, plus labels for unknown and outside-NYC locations.', [
    col('borough_id', 'INTEGER', 'Borough key'),
    col('borough_name', 'TEXT', 'Borough label as published by TLC'),
  ]),
  table('zones', 'One taxi pickup/dropoff zone in New York City.', [
    col('zone_id', 'INTEGER', 'Taxi zone ID'),
    col('zone_name', 'TEXT', 'Zone name'),
    col('borough_id', 'INTEGER', 'Borough containing the zone'),
    col('service_zone', 'TEXT', 'Yellow Zone, Boro Zone, Airports, EWR or N/A'),
    col('is_airport', 'INTEGER', '1 for airport zones (service_zone Airports or EWR)'),
  ], { foreignKeys: [fk('borough_id', 'boroughs')] }),
  table('vendors', 'One system that recorded the trip data.', [
    col('vendor_id', 'INTEGER', 'Vendor ID'),
    col('vendor_name', 'TEXT', 'Provider name'),
  ]),
  table('payment_types', 'One way a trip can be paid (for example card or cash).', [
    col('payment_type_id', 'INTEGER', 'Payment type code'),
    col('description', 'TEXT', 'Meaning of the code'),
    col('tip_recorded', 'INTEGER', '1 when tips are captured in tip_amount (card payments only; cash tips are not recorded)'),
  ]),
  table('rate_codes', 'One taxi fare type (for example standard, JFK, or negotiated).', [
    col('rate_code_id', 'INTEGER', 'Rate code'),
    col('description', 'TEXT', 'Meaning of the code'),
  ]),
  table('calendar', 'One calendar date in the first quarter of 2025.', [
    col('date', 'TEXT', 'Calendar date (YYYY-MM-DD)'),
    col('month', 'INTEGER', 'Month number'),
    col('day_of_week', 'INTEGER', '0 = Sunday … 6 = Saturday'),
    col('day_name', 'TEXT', 'Day name'),
    col('is_weekend', 'INTEGER', '1 on Saturday and Sunday'),
    col('holiday_name', 'TEXT', 'U.S. federal holiday, NULL otherwise', true),
    col('day_of_month', 'INTEGER', 'Day of the month, 1–31'),
  ]),
  table('trips', 'One yellow taxi trip from January–March 2025.', [
    col('trip_id', 'INTEGER', 'Trip key'),
    col('vendor_id', 'INTEGER', 'Recording vendor'),
    col('pickup_at', 'TEXT', 'Meter engaged, NYC local time'),
    col('dropoff_at', 'TEXT', 'Meter disengaged, NYC local time'),
    col('passenger_count', 'INTEGER', 'Driver-entered passengers; NULL when not reported', true),
    col('trip_distance_miles', 'REAL', 'Taximeter distance in miles; can be 0'),
    col('rate_code_id', 'INTEGER', 'Final rate code; NULL when not reported', true),
    col('store_and_fwd_flag', 'TEXT', 'Y when the record was held in the vehicle before sending', true),
    col('pickup_zone_id', 'INTEGER', 'Pickup taxi zone'),
    col('dropoff_zone_id', 'INTEGER', 'Drop-off taxi zone'),
    col('payment_type_id', 'INTEGER', 'How the passenger paid'),
    col('fare_amount', 'REAL', 'Time-and-distance fare in USD; negative on reversals'),
    col('tip_amount', 'REAL', 'Tip in USD; card tips only (cash tips are not recorded)'),
    col('tolls_amount', 'REAL', 'Tolls in USD'),
    col('surcharge_amount', 'REAL', 'Extra + MTA tax + improvement surcharge, USD'),
    col('congestion_surcharge', 'REAL', 'NYS congestion surcharge, USD', true),
    col('airport_fee', 'REAL', 'LaGuardia/JFK pickup fee, USD', true),
    col('cbd_congestion_fee', 'REAL', 'MTA Congestion Relief Zone toll (from 2025-01-05), USD', true),
    col('total_amount', 'REAL', 'Total charged to the passenger excluding cash tips, USD'),
  ], {
    foreignKeys: [fk('vendor_id', 'vendors'), fk('rate_code_id', 'rate_codes'), fk('pickup_zone_id', 'zones', 'zone_id'), fk('dropoff_zone_id', 'zones', 'zone_id'), fk('payment_type_id', 'payment_types')],
    indexes: [['pickup_at'], ['pickup_zone_id']],
  }),
];

async function rows({ dir }) {
  const trips = readExtract(path.join(dir, 'extract', 'trips.tsv.gz'), ['trip_id', 'vendor_id', 'passenger_count', 'trip_distance_miles', 'rate_code_id', 'pickup_zone_id', 'dropoff_zone_id', 'payment_type_id', 'fare_amount', 'tip_amount', 'tolls_amount', 'surcharge_amount', 'congestion_surcharge', 'airport_fee', 'cbd_congestion_fee', 'total_amount']).rows;
  const rawZones = readExtract(path.join(dir, 'extract', 'zones.tsv.gz'), ['zone_id']).rows;
  const boroughNames = [...new Set(rawZones.map(z => z[2]))];
  const boroughs = boroughNames.map((name, i) => [i + 1, name]);
  const boroughId = new Map(boroughNames.map((n, i) => [n, i + 1]));
  const zones = rawZones.map(([id, name, borough, service]) => [id, name, boroughId.get(borough), service, service === 'Airports' || service === 'EWR' ? 1 : 0]);
  const calendar = [];
  for (let t = Date.UTC(2025, 0, 1); t < Date.UTC(2025, 3, 1); t += 86400000) {
    const d = new Date(t), date = d.toISOString().slice(0, 10), w = d.getUTCDay();
    calendar.push([date, d.getUTCMonth() + 1, w, DAY_NAMES[w], w === 0 || w === 6 ? 1 : 0, HOLIDAYS[date] ?? null, d.getUTCDate()]);
  }
  return { boroughs, zones, vendors: VENDORS, payment_types: PAYMENT_TYPES, rate_codes: RATE_CODES, calendar, trips };
}

const dataset = {
  id: 'mobility',
  version: '3.0.0',
  name: 'Mobility',
  domain: 'Urban mobility',
  kind: 'real',
  description: 'A 1-in-87 sample of New York City yellow taxi trips from January–March 2025: pickup and drop-off zones, distances, fares, tips, fees and payment types.',
  source: {
    publisher: 'New York City Taxi and Limousine Commission (TLC)',
    url: 'https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page',
    release: 'Yellow Taxi Trip Records, January–March 2025 (Parquet); taxi zone lookup table',
    license: 'NYC Open Data Terms of Use (free to use, including commercial use, without restriction)',
    licenseUrl: 'https://opendata.cityofnewyork.us/overview/#termsofuse',
    commercialReuse: 'permitted',
    attribution: 'Source: NYC Taxi and Limousine Commission, TLC Trip Record Data. Modified by Runtime.',
    retrieved: '2026-10-14',
    transformations: [
      'Deterministic ~1.15% sample of trip records (FNV-1a hash of month and source row number).',
      'extra, mta_tax and improvement_surcharge combined into surcharge_amount; all other amounts kept as recorded.',
      'Timestamps written as NYC local clock time; records outside the file month are kept as published.',
      'Borough names normalised into a boroughs table; code lists from the TLC data dictionary.',
    ],
  },
  reproduction: { command: 'node datasets/acquire/download.mjs <dir> mobility && node datasets/acquire/mobility.mjs <dir> && node datasets/build.mjs mobility', implementation: 'datasets/acquire/mobility.mjs, datasets/mobility/dataset.mjs', notes: 'Committed extracts in datasets/mobility/extract are the build input.' },
  coverage: { start: '2025-01-01', end: '2025-03-31', grain: 'taxi trip' },
  tables,
  edgeCases: [
    'Flex-fare trips with NULL passenger count and rate code',
    'Negative fares on reversals and disputes',
    'Zero-distance trips',
    'Cash trips record no tip',
    'Unknown and outside-NYC zones',
    'Congestion Relief Zone fee starting 5 January 2025',
    'A pickup timestamp outside the published month',
  ],
  qualityNotes: [
    'Cash tips are not recorded, so tip rates should be measured on card trips.',
    'trip_distance_miles is the meter distance, not a straight line between zones.',
    'This is a sample; multiply counts by roughly 87 to estimate citywide volume.',
  ],
  concepts: ['aggregation', 'GROUP BY', 'HAVING', 'dates', 'monthly analysis', 'NULL handling', 'geography'],
  rows,
  mutation: `
UPDATE trips SET fare_amount = fare_amount + 12.5, total_amount = total_amount + 12.5 WHERE trip_id % 89 = 0;
UPDATE trips SET tip_amount = tip_amount + 3, total_amount = total_amount + 3 WHERE trip_id % 151 = 0 AND payment_type_id = 1;
UPDATE trips SET pickup_zone_id = 132 WHERE trip_id % 131 = 0;
UPDATE trips SET pickup_at = '2025-02-01 00:00:00', dropoff_at = '2025-02-01 00:20:00' WHERE trip_id = (SELECT MAX(trip_id) FROM trips WHERE pickup_at < '2025-02-01');
DELETE FROM trips WHERE trip_id % 173 = 0;
INSERT INTO zones VALUES (266, 'Runtime Test Zone', 2, 'Boro Zone', 0);
INSERT INTO zones VALUES (267, 'Runtime Airport Annex', 3, 'Airports', 1);
INSERT INTO trips SELECT (SELECT MAX(trip_id) + 1 FROM trips), 2, '2025-03-31 23:50:00', '2025-04-01 00:20:00', NULL, 7.2, 1, 'N', 267, 132, 1, 31.0, 7.0, 0, 5.25, 2.5, 1.75, 0.75, 48.25;
UPDATE trips SET passenger_count = NULL WHERE trip_id % 223 = 0;
UPDATE trips SET payment_type_id = 2, tip_amount = 0 WHERE trip_id % 307 = 0 AND payment_type_id = 1;
`,
  contract: {
    totalRows: [100000, 150000],
    minRows: { trips: 100000, zones: 260, boroughs: 6, payment_types: 6, rate_codes: 6, vendors: 3, calendar: 90 },
    checks: [
      { name: 'pickup dates covered', sql: "SELECT COUNT(DISTINCT substr(pickup_at, 1, 10)) FROM trips WHERE pickup_at >= '2025-01-01' AND pickup_at < '2025-04-01'", equals: 90 },
      { name: 'pickup zones used', sql: distinct('trips', 'pickup_zone_id'), min: 200 },
      { name: 'largest pickup-zone share', sql: maxShare('trips', 'pickup_zone_id'), max: 0.06 },
      { name: 'NULL passenger counts', sql: nulls('trips', 'passenger_count'), min: 5000 },
      { name: 'negative fares', sql: 'SELECT COUNT(*) FROM trips WHERE fare_amount < 0', min: 1000 },
      { name: 'zero-distance trips', sql: 'SELECT COUNT(*) FROM trips WHERE trip_distance_miles = 0', min: 500 },
      { name: 'cash trips', sql: 'SELECT COUNT(*) FROM trips WHERE payment_type_id = 2', min: 5000 },
      { name: 'congestion relief fees charged', sql: 'SELECT COUNT(*) FROM trips WHERE cbd_congestion_fee > 0', min: 10000 },
      { name: 'airport pickups', sql: "SELECT COUNT(*) FROM trips t JOIN zones z ON z.zone_id = t.pickup_zone_id WHERE z.service_zone = 'Airports'", min: 3000 },
    ],
  },
};

export default dataset;
