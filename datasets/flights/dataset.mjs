import path from 'node:path';
import { col, fk, table } from '../lib/schema.mjs';
import { readExtract } from '../lib/extract.mjs';
import { maxShare, distinct, nulls } from '../lib/contract.mjs';

/** Carrier names and groups as published by the carriers; codes are BTS reporting-carrier codes. */
const AIRLINES = {
  AA: ['American Airlines', 'network'], AS: ['Alaska Airlines', 'network'], B6: ['JetBlue Airways', 'low-cost'], DL: ['Delta Air Lines', 'network'],
  F9: ['Frontier Airlines', 'ultra-low-cost'], G4: ['Allegiant Air', 'ultra-low-cost'], HA: ['Hawaiian Airlines', 'network'], MQ: ['Envoy Air', 'regional'],
  NK: ['Spirit Airlines', 'ultra-low-cost'], OH: ['PSA Airlines', 'regional'], OO: ['SkyWest Airlines', 'regional'], UA: ['United Airlines', 'network'],
  WN: ['Southwest Airlines', 'low-cost'], YX: ['Republic Airways', 'regional'], '9E': ['Endeavor Air', 'regional'],
};
const AIRPORT_NAME_FALLBACK = { PBI: 'Palm Beach International Airport' };
const HOLIDAYS = { '2025-01-01': "New Year's Day", '2025-01-20': 'Martin Luther King Jr. Day', '2025-02-17': "Washington's Birthday" };
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['January', 'February', 'March'];

const tables = [
  table('airlines', 'One airline.', [
    col('airline_code', 'TEXT', 'Airline code'),
    col('airline_name', 'TEXT', 'Airline name'),
    col('carrier_group', 'TEXT', 'network, low-cost, ultra-low-cost, or regional'),
  ]),
  table('airports', 'One airport that appears in this dataset.', [
    col('airport_code', 'TEXT', 'Airport code (for example JFK)'),
    col('airport_name', 'TEXT', 'Airport name'),
    col('city', 'TEXT', 'City'),
    col('state', 'TEXT', 'Two-letter state or territory code'),
    col('state_name', 'TEXT', 'State or territory name'),
    col('latitude', 'REAL', 'Latitude', true),
    col('longitude', 'REAL', 'Longitude', true),
    col('elevation_ft', 'INTEGER', 'Elevation in feet', true),
  ], { indexes: [['state']] }),
  table('routes', 'One flight path from an origin airport to a destination airport.', [
    col('route_id', 'INTEGER', 'Route key'),
    col('origin', 'TEXT', 'Departure airport'),
    col('destination', 'TEXT', 'Arrival airport'),
    col('distance_miles', 'INTEGER', 'Distance between the airports in miles'),
  ], { foreignKeys: [fk('origin', 'airports', 'airport_code'), fk('destination', 'airports', 'airport_code')], indexes: [['origin'], ['destination']] }),
  table('calendar', 'One calendar date in the first quarter of 2025.', [
    col('date', 'TEXT', 'Calendar date (YYYY-MM-DD)'),
    col('year', 'INTEGER', 'Year'),
    col('quarter', 'INTEGER', 'Quarter number'),
    col('month', 'INTEGER', 'Month number'),
    col('month_name', 'TEXT', 'Month name'),
    col('day_of_month', 'INTEGER', 'Day of month'),
    col('day_of_week', 'INTEGER', '0 = Sunday … 6 = Saturday'),
    col('day_name', 'TEXT', 'Day name'),
    col('is_weekend', 'INTEGER', '1 on Saturday and Sunday'),
    col('holiday_name', 'TEXT', 'U.S. federal holiday, NULL otherwise', true),
  ]),
  table('cancellation_reasons', 'One reason a flight can be cancelled (for example weather or carrier).', [
    col('code', 'TEXT', 'A, B, C or D'),
    col('description', 'TEXT', 'Reason description'),
  ]),
  table('flights', 'One scheduled domestic flight, including cancelled and diverted flights.', [
    col('flight_id', 'INTEGER', 'Flight key'),
    col('flight_date', 'TEXT', 'Scheduled departure date'),
    col('airline_code', 'TEXT', 'Airline that operated the flight'),
    col('flight_number', 'INTEGER', 'Flight number; repeats across days'),
    col('tail_number', 'TEXT', 'Aircraft ID; NULL when not reported', true),
    col('origin', 'TEXT', 'Departure airport'),
    col('destination', 'TEXT', 'Arrival airport'),
    col('route_id', 'INTEGER', 'Route for this origin and destination'),
    col('scheduled_departure', 'TEXT', 'Scheduled departure time at the origin'),
    col('actual_departure', 'TEXT', 'Actual departure time; NULL if cancelled', true),
    col('departure_delay', 'INTEGER', 'Minutes late leaving (negative = early); NULL if cancelled', true),
    col('taxi_out_minutes', 'INTEGER', 'Minutes from leaving the gate to takeoff', true),
    col('scheduled_arrival', 'TEXT', 'Scheduled arrival time at the destination'),
    col('actual_arrival', 'TEXT', 'Actual arrival time; NULL if cancelled or diverted', true),
    col('arrival_delay', 'INTEGER', 'Minutes late arriving (negative = early); NULL if cancelled or diverted', true),
    col('air_time_minutes', 'INTEGER', 'Minutes in the air', true),
    col('distance_miles', 'INTEGER', 'Route distance in miles'),
    col('cancelled', 'INTEGER', '1 if the flight was cancelled'),
    col('cancellation_code', 'TEXT', 'Why it was cancelled', true),
    col('diverted', 'INTEGER', '1 if the flight landed somewhere other than its destination'),
    col('carrier_delay', 'INTEGER', 'Minutes of delay blamed on the airline (only when arrival delay is 15+ minutes)', true),
    col('weather_delay', 'INTEGER', 'Minutes of delay blamed on weather', true),
    col('nas_delay', 'INTEGER', 'Minutes of delay blamed on air traffic control', true),
    col('security_delay', 'INTEGER', 'Minutes of delay blamed on security', true),
    col('late_aircraft_delay', 'INTEGER', 'Minutes of delay from a late incoming aircraft', true),
  ], {
    foreignKeys: [fk('airline_code', 'airlines'), fk('origin', 'airports', 'airport_code'), fk('destination', 'airports', 'airport_code'), fk('route_id', 'routes'), fk('flight_date', 'calendar', 'date'), fk('cancellation_code', 'cancellation_reasons', 'code')],
    indexes: [['flight_date'], ['origin'], ['tail_number', 'scheduled_departure']],
  }),
];

async function rows({ dir }) {
  const ex = (name, numeric) => readExtract(path.join(dir, 'extract', `${name}.tsv.gz`), numeric).rows;
  const flights = ex('flights', ['flight_id', 'flight_number', 'route_id', 'departure_delay', 'taxi_out_minutes', 'arrival_delay', 'air_time_minutes', 'distance_miles', 'cancelled', 'diverted', 'carrier_delay', 'weather_delay', 'nas_delay', 'security_delay', 'late_aircraft_delay']);
  const airports = ex('airports', ['latitude', 'longitude', 'elevation_ft']).map(a => [a[0], a[1] ?? AIRPORT_NAME_FALLBACK[a[0]], ...a.slice(2)]);
  const routes = ex('routes', ['route_id', 'distance_miles']);
  const codes = [...new Set(flights.map(f => f[2]))].sort();
  const airlines = codes.map(c => { if (!AIRLINES[c]) throw new Error(`Unknown carrier ${c}`); return [c, ...AIRLINES[c]]; });
  const calendar = [];
  for (let t = Date.UTC(2025, 0, 1); t < Date.UTC(2025, 3, 1); t += 86400000) {
    const d = new Date(t), date = d.toISOString().slice(0, 10), w = d.getUTCDay();
    calendar.push([date, 2025, 1, d.getUTCMonth() + 1, MONTH_NAMES[d.getUTCMonth()], d.getUTCDate(), w, DAY_NAMES[w], w === 0 || w === 6 ? 1 : 0, HOLIDAYS[date] ?? null]);
  }
  const reasons = [['A', 'Carrier'], ['B', 'Weather'], ['C', 'National Air System'], ['D', 'Security']];
  return { airlines, airports, routes, calendar, cancellation_reasons: reasons, flights };
}

const dataset = {
  id: 'flights',
  version: '3.0.0',
  name: 'U.S. Flights',
  domain: 'Aviation',
  kind: 'real',
  description: 'Every domestic flight flown by a sample of 435 aircraft in January–March 2025: schedules, delays, cancellations, diversions and delay causes.',
  source: {
    publisher: 'U.S. Department of Transportation, Bureau of Transportation Statistics; OurAirports',
    url: 'https://www.transtats.bts.gov/DL_SelectFields.aspx?gnoyr_VQ=FGJ&QO_fu146_anzr=b0-gvzr',
    release: 'Reporting Carrier On-Time Performance (1987–present), January–March 2025; OurAirports airports.csv retrieved 2026-10-14',
    license: 'U.S. government work (public domain); OurAirports data is public domain',
    licenseUrl: 'https://www.bts.gov/policies-and-notices',
    commercialReuse: 'permitted',
    attribution: 'Source: U.S. Bureau of Transportation Statistics, Reporting Carrier On-Time Performance. Airport names and coordinates: OurAirports (ourairports.com). Modified by Runtime.',
    retrieved: '2026-10-14',
    transformations: [
      'All flights of a deterministic 7.5% sample of aircraft (FNV-1a hash of tail number); flights without a tail number sampled by carrier, flight number and date.',
      'Selected 25 of 110 source fields; diversion detail fields are omitted.',
      'Clock times combined with the flight date; actual times are scheduled time plus reported delay minutes.',
      'Scheduled arrival date chosen so local arrival is closest to departure plus scheduled elapsed time.',
      'Airport names and coordinates joined from OurAirports by IATA code; carrier names and groups added by Runtime.',
    ],
  },
  reproduction: { command: 'node datasets/acquire/download.mjs <dir> flights && node datasets/acquire/flights.mjs <dir> && node datasets/build.mjs flights', implementation: 'datasets/acquire/flights.mjs, datasets/flights/dataset.mjs', notes: 'Committed extracts in datasets/flights/extract are the build input.' },
  coverage: { start: '2025-01-01', end: '2025-03-31', grain: 'flight leg' },
  tables,
  edgeCases: [
    'Cancelled flights with NULL actual times and delays',
    'Diverted flights with a departure but no arrival delay',
    'Early departures and arrivals (negative delays)',
    'Overnight flights arriving the next calendar day',
    'Local times in different time zones at origin and destination',
    'Delay causes reported only for arrivals 15+ minutes late',
    'Flights without a reported tail number',
    'Holidays and weekends in the calendar',
  ],
  qualityNotes: [
    'Times are local; subtracting departure from arrival across time zones does not give duration. Use air_time_minutes.',
    'A cancelled flight has unknown delay, not zero delay.',
    'The sample is of aircraft, so carrier shares reflect the sampled fleet as well as schedules.',
  ],
  concepts: ['dates', 'CTEs', 'ROW_NUMBER', 'LAG', 'conditional aggregation', 'date boundaries', 'SARGability', 'ranking'],
  rows,
  mutation: `
UPDATE flights SET departure_delay = departure_delay + 45, arrival_delay = arrival_delay + 45, actual_departure = strftime('%Y-%m-%d %H:%M', actual_departure, '+45 minutes'), actual_arrival = strftime('%Y-%m-%d %H:%M', actual_arrival, '+45 minutes') WHERE flight_id % 97 = 0 AND cancelled = 0 AND diverted = 0;
UPDATE flights SET cancelled = 1, cancellation_code = 'B', actual_departure = NULL, departure_delay = NULL, taxi_out_minutes = NULL, actual_arrival = NULL, arrival_delay = NULL, air_time_minutes = NULL, carrier_delay = NULL, weather_delay = NULL, nas_delay = NULL, security_delay = NULL, late_aircraft_delay = NULL WHERE flight_id % 251 = 0 AND cancelled = 0;
UPDATE flights SET scheduled_departure = '2025-01-31 23:59' WHERE flight_id = (SELECT MIN(flight_id) FROM flights WHERE flight_date = '2025-01-31' AND cancelled = 0);
UPDATE flights SET scheduled_departure = '2025-02-01 00:00', flight_date = '2025-02-01' WHERE flight_id = (SELECT MAX(flight_id) FROM flights WHERE flight_date = '2025-01-31');
DELETE FROM flights WHERE flight_id % 199 = 0;
INSERT INTO airports VALUES ('ZZV', 'Zanesville Municipal Airport', 'Zanesville', 'OH', 'Ohio', 39.9444, -81.8921, 900);
INSERT INTO routes VALUES ((SELECT MAX(route_id) + 1 FROM routes), 'JFK', 'ZZV', 471);
INSERT INTO flights SELECT (SELECT MAX(flight_id) + 1 FROM flights), '2025-02-28', 'AA', 9999, 'N999RT', 'JFK', 'ZZV', (SELECT MAX(route_id) FROM routes), '2025-02-28 23:10', '2025-02-28 23:40', 30, 15, '2025-03-01 00:55', '2025-03-01 01:20', 25, 70, 471, 0, NULL, 0, 10, 0, 15, 0, 0;
UPDATE flights SET tail_number = 'N999RT' WHERE flight_id IN (SELECT flight_id FROM flights WHERE flight_date = '2025-01-15' AND tail_number IS NOT NULL ORDER BY flight_id LIMIT 2);
UPDATE airports SET state = 'TX' WHERE airport_code = (SELECT origin FROM flights WHERE origin IN (SELECT airport_code FROM airports WHERE state = 'OK') LIMIT 1);
`,
  contract: {
    totalRows: [100000, 150000],
    minRows: { flights: 100000, airports: 250, airlines: 10, routes: 3000, calendar: 90, cancellation_reasons: 4 },
    checks: [
      { name: 'flight dates covered', sql: distinct('flights', 'flight_date'), equals: 90 },
      { name: 'aircraft (tail numbers)', sql: distinct('flights', 'tail_number'), min: 300 },
      { name: 'largest airline share', sql: maxShare('flights', 'airline_code'), max: 0.3 },
      { name: 'largest origin share', sql: maxShare('flights', 'origin'), max: 0.1 },
      { name: 'cancelled flights', sql: 'SELECT SUM(cancelled) FROM flights', min: 1000 },
      { name: 'diverted flights', sql: 'SELECT SUM(diverted) FROM flights', min: 100 },
      { name: 'cancelled flights have no delay', sql: 'SELECT COUNT(*) FROM flights WHERE cancelled = 1 AND departure_delay IS NOT NULL', equals: 0 },
      { name: 'early departures', sql: 'SELECT COUNT(*) FROM flights WHERE departure_delay < 0', min: 30000 },
      { name: 'overnight arrivals', sql: 'SELECT COUNT(*) FROM flights WHERE substr(scheduled_arrival, 1, 10) > flight_date', min: 500 },
      { name: 'cancellation reasons used', sql: distinct('flights', 'cancellation_code'), min: 3 },
      { name: 'flights with delay causes', sql: 'SELECT COUNT(*) FROM flights WHERE carrier_delay IS NOT NULL', min: 10000 },
      { name: 'flights without tail number', sql: nulls('flights', 'tail_number'), min: 50 },
      { name: 'airports without coordinates', sql: nulls('airports', 'latitude'), max: 5 },
    ],
  },
};

export default dataset;
