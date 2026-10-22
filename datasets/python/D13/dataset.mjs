/**
 * D13 U.S. domestic flights, January–March 2025: real BTS Reporting Carrier On-Time Performance records for a
 * deterministic 7.5% sample of aircraft, with OurAirports names and coordinates. Python reuses the pinned extract the
 * SQL flights dataset commits (datasets/flights/extract, provenance in datasets/flights/source.json). None of the SQL
 * dataset's teaching edits are applied here: cancellations, diversions and delays are exactly as reported.
 * U.S. government work (public domain); OurAirports data is public domain.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readExtract } from '../../lib/extract.mjs';

const EXTRACT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../flights/extract');
const col = (name, type, description, nullable = false) => ({ name, type, description, nullable });
const read = (name, numeric) => {
  const { columns, rows } = readExtract(path.join(EXTRACT, `${name}.tsv.gz`), numeric);
  return rows.map(r => Object.fromEntries(columns.map((c, i) => [c, r[i]])));
};
/** Carrier names and groups as published by the carriers; codes are BTS reporting-carrier codes. */
const AIRLINES = {
  AA: ['American Airlines', 'network'], AS: ['Alaska Airlines', 'network'], B6: ['JetBlue Airways', 'low-cost'], DL: ['Delta Air Lines', 'network'],
  F9: ['Frontier Airlines', 'ultra-low-cost'], G4: ['Allegiant Air', 'ultra-low-cost'], HA: ['Hawaiian Airlines', 'network'], MQ: ['Envoy Air', 'regional'],
  NK: ['Spirit Airlines', 'ultra-low-cost'], OH: ['PSA Airlines', 'regional'], OO: ['SkyWest Airlines', 'regional'], UA: ['United Airlines', 'network'],
  WN: ['Southwest Airlines', 'low-cost'], YX: ['Republic Airways', 'regional'], '9E': ['Endeavor Air', 'regional'],
};
const CANCELLATION = [['A', 'Carrier'], ['B', 'Weather'], ['C', 'National Air System'], ['D', 'Security']];

function generate() {
  const flights = read('flights', ['flight_id', 'flight_number', 'route_id', 'departure_delay', 'taxi_out_minutes', 'arrival_delay', 'air_time_minutes', 'distance_miles', 'cancelled', 'diverted', 'carrier_delay', 'weather_delay', 'nas_delay', 'security_delay', 'late_aircraft_delay'])
    .map(({ route_id, ...f }) => f);
  const airports = read('airports', ['latitude', 'longitude', 'elevation_ft']);
  const codes = [...new Set(flights.map(f => f.airline_code))].sort();
  const airlines = codes.map(c => ({ airline_code: c, airline_name: AIRLINES[c][0], carrier_group: AIRLINES[c][1] }));
  return { flights, airlines, airports, cancellation_reasons: CANCELLATION.map(([code, reason]) => ({ code, reason })) };
}

const EDITIONS = {
  preview: { from: '2025-01-10', to: '2025-01-10', limit: 25 },
  starter: { from: '2025-01-10', to: '2025-01-10' },
  standard: { from: '2025-01-06', to: '2025-01-19' },
  full: { from: '0000', to: '9999' },
};

function cutEdition(full, edition) {
  const e = EDITIONS[edition];
  let flights = full.flights.filter(f => f.flight_date >= e.from && f.flight_date <= e.to);
  if (e.limit) flights = flights.slice(0, e.limit);
  const used = new Set(flights.flatMap(f => [f.origin, f.destination]));
  const carriers = new Set(flights.map(f => f.airline_code));
  return {
    flights,
    airlines: full.airlines.filter(a => carriers.has(a.airline_code)),
    airports: full.airports.filter(a => used.has(a.airport_code)),
    cancellation_reasons: full.cancellation_reasons,
  };
}

function realIssues({ flights }) {
  return [
    { id: 'cancelled', description: 'Cancelled flights: no actual times or delays (unknown, not zero)', count: flights.filter(f => f.cancelled === 1).length },
    { id: 'diverted', description: 'Diverted flights: departed but never arrived at the scheduled destination', count: flights.filter(f => f.diverted === 1).length },
    { id: 'early', description: 'Flights that arrived early (negative arrival delay)', count: flights.filter(f => f.arrival_delay !== null && f.arrival_delay < 0).length },
    { id: 'overnight', description: 'Flights scheduled to arrive on a later calendar date than they departed', count: flights.filter(f => f.scheduled_arrival.slice(0, 10) > f.scheduled_departure.slice(0, 10)).length },
    { id: 'no_tail', description: 'Flights with no tail number reported', count: flights.filter(f => f.tail_number === null).length },
  ];
}

const dataset = {
  id: 'D13',
  title: 'U.S. Domestic Flights',
  version: 1,
  seed: null,
  description:
    'Real U.S. domestic flights, January–March 2025: schedules, departure and arrival delays, cancellations, diversions ' +
    'and delay causes, for every flight flown by a 7.5% sample of aircraft. Times are local to each airport.',
  licence: { name: 'U.S. government work (public domain); OurAirports data is public domain', status: 'cleared' },
  attribution: 'Source: U.S. Bureau of Transportation Statistics, Reporting Carrier On-Time Performance. Airports: OurAirports. Sampled by Runtime.',
  source: 'BTS On_Time_Reporting_Carrier_On_Time_Performance 2025-01..03 and OurAirports airports.csv, via datasets/flights/extract (datasets/flights/source.json)',
  generator: 'datasets/python/D13/dataset.mjs from datasets/flights/extract',
  window: ['2025-01-01', '2025-03-31'],
  tables: {
    flights: {
      description: 'One scheduled flight, including cancelled and diverted flights.',
      primaryKey: ['flight_id'],
      foreignKeys: [{ column: 'airline_code', references: 'airlines.airline_code' }, { column: 'origin', references: 'airports.airport_code' }, { column: 'destination', references: 'airports.airport_code' }, { column: 'cancellation_code', references: 'cancellation_reasons.code' }],
      columns: [
        col('flight_id', 'integer', 'Flight ID'), col('flight_date', 'date', 'Scheduled departure date (local)'),
        col('airline_code', 'text', 'Airline code'), col('flight_number', 'integer', 'Flight number'), col('tail_number', 'text', 'Aircraft registration', true),
        col('origin', 'text', 'Departure airport'), col('destination', 'text', 'Arrival airport'),
        col('scheduled_departure', 'timestamp', 'Scheduled departure, origin local time'), col('actual_departure', 'timestamp', 'Actual departure, origin local time', true),
        col('departure_delay', 'integer', 'Minutes late leaving (negative = early)', true), col('taxi_out_minutes', 'integer', 'Minutes from leaving the gate to take-off', true),
        col('scheduled_arrival', 'timestamp', 'Scheduled arrival, destination local time'), col('actual_arrival', 'timestamp', 'Actual arrival, destination local time', true),
        col('arrival_delay', 'integer', 'Minutes late arriving (negative = early)', true), col('air_time_minutes', 'integer', 'Minutes in the air', true),
        col('distance_miles', 'integer', 'Route distance, miles'), col('cancelled', 'integer', '1 if cancelled'), col('cancellation_code', 'text', 'Why it was cancelled', true),
        col('diverted', 'integer', '1 if diverted'),
        col('carrier_delay', 'integer', 'Delay minutes blamed on the airline (arrivals 15+ minutes late only)', true), col('weather_delay', 'integer', 'Delay minutes due to weather', true),
        col('nas_delay', 'integer', 'Delay minutes due to air traffic control and airport congestion', true), col('security_delay', 'integer', 'Delay minutes due to security', true),
        col('late_aircraft_delay', 'integer', 'Delay minutes because the aircraft arrived late', true),
      ],
    },
    airlines: { description: 'One airline.', primaryKey: ['airline_code'], columns: [col('airline_code', 'text', 'Airline code'), col('airline_name', 'text', 'Airline name'), col('carrier_group', 'text', 'network, low-cost, ultra-low-cost or regional')] },
    airports: {
      description: 'One airport that a flight here departs from or arrives at.',
      primaryKey: ['airport_code'],
      columns: [
        col('airport_code', 'text', 'Three-letter airport code'), col('airport_name', 'text', 'Airport name; sometimes empty', true), col('city', 'text', 'City'), col('state', 'text', 'State or territory code'),
        col('state_name', 'text', 'State or territory'), col('latitude', 'decimal', 'Latitude', true), col('longitude', 'decimal', 'Longitude', true), col('elevation_ft', 'integer', 'Elevation, feet', true),
      ],
    },
    cancellation_reasons: { description: 'What each cancellation code means.', primaryKey: ['code'], columns: [col('code', 'text', 'Code'), col('reason', 'text', 'Reason')] },
  },
  editions: Object.fromEntries(Object.keys(EDITIONS).map(k => [k, k])),
  parquet: { tables: ['flights'] },
  stress: false,
  generate,
  cutEdition,
  realIssues,
};

export default dataset;
