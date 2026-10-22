/**
 * D06 NYC Yellow Taxi trips, January–March 2025: real TLC trip records. Python reuses the pinned extract the SQL
 * mobility dataset commits (datasets/mobility/extract, provenance in datasets/mobility/source.json), a deterministic
 * sample of about 1,400 trips a day. Nothing is injected: missing passenger counts, zero-distance trips, negative
 * (refunded) fares and trips that start before the window are all as TLC published them.
 * NYC Open Data terms: free to use, including commercially.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readExtract } from '../../lib/extract.mjs';

const EXTRACT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../mobility/extract');
const col = (name, type, description, nullable = false) => ({ name, type, description, nullable });
// Code lists from the TLC Yellow Taxi data dictionary (March 2025 revision).
const PAYMENT_TYPES = [[0, 'Flex fare trip'], [1, 'Credit card'], [2, 'Cash'], [3, 'No charge'], [4, 'Dispute'], [5, 'Unknown'], [6, 'Voided trip']];
const RATE_CODES = [[1, 'Standard rate'], [2, 'JFK'], [3, 'Newark'], [4, 'Nassau or Westchester'], [5, 'Negotiated fare'], [6, 'Group ride'], [99, 'Null/unknown']];

function generate() {
  const num = ['trip_id', 'vendor_id', 'passenger_count', 'trip_distance_miles', 'rate_code_id', 'pickup_zone_id', 'dropoff_zone_id', 'payment_type_id', 'fare_amount', 'tip_amount', 'tolls_amount', 'surcharge_amount', 'congestion_surcharge', 'airport_fee', 'cbd_congestion_fee', 'total_amount'];
  const t = readExtract(path.join(EXTRACT, 'trips.tsv.gz'), num);
  const trips = t.rows.map(r => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
  const z = readExtract(path.join(EXTRACT, 'zones.tsv.gz'), ['zone_id']);
  const zones = z.rows.map(r => Object.fromEntries(z.columns.map((c, i) => [c, r[i]])));
  return {
    trips,
    zones,
    payment_types: PAYMENT_TYPES.map(([payment_type_id, description]) => ({ payment_type_id, description })),
    rate_codes: RATE_CODES.map(([rate_code_id, description]) => ({ rate_code_id, description })),
  };
}

const EDITIONS = {
  preview: { from: '2025-01-15', to: '2025-01-15 23:59:59', limit: 25 },
  starter: { from: '2025-01-15', to: '2025-01-15 23:59:59' },
  standard: { from: '2025-01-13', to: '2025-01-19 23:59:59' },
  full: { from: '0000', to: '9999' },
};

function cutEdition(full, edition) {
  const e = EDITIONS[edition];
  let trips = full.trips.filter(t => t.pickup_at >= e.from && t.pickup_at <= e.to);
  if (e.limit) trips = trips.slice(0, e.limit);
  return { trips, zones: full.zones, payment_types: full.payment_types, rate_codes: full.rate_codes };
}

function realIssues({ trips }) {
  return [
    { id: 'missing_passengers', description: 'Trips with no passenger count', count: trips.filter(t => t.passenger_count === null).length },
    { id: 'zero_distance', description: 'Trips with a distance of 0 miles', count: trips.filter(t => t.trip_distance_miles === 0).length },
    { id: 'negative_fare', description: 'Trips with a negative fare (refunds and voids)', count: trips.filter(t => t.fare_amount < 0).length },
    { id: 'zero_passengers', description: 'Trips recorded with 0 passengers', count: trips.filter(t => t.passenger_count === 0).length },
    { id: 'dropoff_before_pickup', description: 'Trips whose dropoff time is not after the pickup time', count: trips.filter(t => t.dropoff_at <= t.pickup_at).length },
    { id: 'unknown_rate', description: 'Trips with rate code 99 (unknown) or none', count: trips.filter(t => t.rate_code_id === 99 || t.rate_code_id === null).length },
  ];
}

const dataset = {
  id: 'D06',
  title: 'NYC Yellow Taxi Trips',
  version: 1,
  seed: null,
  description:
    'Real New York City yellow taxi trips, January–March 2025, from the TLC trip records: pickup and dropoff times and ' +
    'zones, distance, fare, tip, tolls and surcharges. A deterministic sample of about 1,400 trips a day. Gaps and odd ' +
    'values are as TLC published them.',
  licence: { name: 'NYC Open Data Terms of Use (free to use, including commercial use)', status: 'cleared' },
  attribution: 'Source: NYC Taxi and Limousine Commission (TLC) Trip Record Data. Sampled by Runtime.',
  source: 'NYC TLC yellow_tripdata_2025-01..03.parquet and taxi_zone_lookup.csv, via datasets/mobility/extract (datasets/mobility/source.json)',
  generator: 'datasets/python/D06/dataset.mjs from datasets/mobility/extract',
  window: ['2025-01-01', '2025-03-31'],
  tables: {
    trips: {
      description: 'One taxi trip.',
      primaryKey: ['trip_id'],
      foreignKeys: [
        { column: 'pickup_zone_id', references: 'zones.zone_id' }, { column: 'dropoff_zone_id', references: 'zones.zone_id' },
        { column: 'payment_type_id', references: 'payment_types.payment_type_id' }, { column: 'rate_code_id', references: 'rate_codes.rate_code_id' },
      ],
      columns: [
        col('trip_id', 'integer', 'Trip ID'), col('vendor_id', 'integer', 'Company whose meter system recorded the trip'),
        col('pickup_at', 'timestamp', 'When the meter started, New York local time'), col('dropoff_at', 'timestamp', 'When the meter stopped, New York local time'),
        col('passenger_count', 'integer', 'Passengers, as entered by the driver; sometimes missing', true),
        col('trip_distance_miles', 'decimal', 'Distance on the taximeter, miles'), col('rate_code_id', 'integer', 'Final rate code; empty when not reported', true),
        col('store_and_fwd_flag', 'text', 'Y when the car stored the trip and sent it later', true),
        col('pickup_zone_id', 'integer', 'Pickup taxi zone'), col('dropoff_zone_id', 'integer', 'Dropoff taxi zone'),
        col('payment_type_id', 'integer', 'How the passenger paid'), col('fare_amount', 'decimal', 'Time-and-distance fare, USD'),
        col('tip_amount', 'decimal', 'Tip, USD; cash tips are not recorded'), col('tolls_amount', 'decimal', 'Tolls, USD'),
        col('surcharge_amount', 'decimal', 'Extras and surcharges, USD'), col('congestion_surcharge', 'decimal', 'New York State congestion surcharge, USD', true),
        col('airport_fee', 'decimal', 'Airport pickup fee, USD', true), col('cbd_congestion_fee', 'decimal', 'Manhattan congestion-pricing fee, USD (from 5 January 2025)', true),
        col('total_amount', 'decimal', 'Total charged, USD (excludes cash tips)'),
      ],
    },
    zones: {
      description: 'One New York taxi zone.',
      primaryKey: ['zone_id'],
      columns: [col('zone_id', 'integer', 'Zone ID'), col('zone_name', 'text', 'Zone name'), col('borough', 'text', 'Borough (or EWR / Unknown / N/A)'), col('service_zone', 'text', 'Yellow Zone, Boro Zone, Airports, EWR or N/A', true)],
    },
    payment_types: { description: 'Payment type codes.', primaryKey: ['payment_type_id'], columns: [col('payment_type_id', 'integer', 'Code'), col('description', 'text', 'Meaning')] },
    rate_codes: { description: 'Rate code meanings.', primaryKey: ['rate_code_id'], columns: [col('rate_code_id', 'integer', 'Code'), col('description', 'text', 'Meaning')] },
  },
  editions: Object.fromEntries(Object.keys(EDITIONS).map(k => [k, k])),
  parquet: { tables: ['trips'] },
  stress: false,
  generate,
  cutEdition,
  realIssues,
};

export default dataset;
