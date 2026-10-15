/**
 * Mobility extract from NYC TLC Yellow Taxi Trip Records, January–March 2025 (NYC Open Data terms).
 *   node datasets/acquire/mobility.mjs <downloads-dir>
 *
 * Selection: a deterministic ~1.15% sample of trip records (FNV-1a of month and source row number).
 * Every field value is preserved as recorded, including zero distances, negative amounts and
 * records whose timestamps fall outside the file month. Times are NYC local clock times.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';
import { asyncBufferFromFile, parquetMetadataAsync, parquetReadObjects } from 'hyparquet';
import { csvRows } from './csv.mjs';
import { writeExtract } from '../lib/extract.mjs';
import { hash32 } from '../lib/rng.mjs';
import { SOURCES } from './sources.mjs';

const SAMPLE_PER_10K = 115;
const dir = process.argv[2];
if (!dir) throw new Error('Usage: node datasets/acquire/mobility.mjs <downloads-dir>');
const compressors = { ZSTD: input => new Uint8Array(zlib.zstdDecompressSync(input)) };
const pad = n => String(n).padStart(2, '0');
const local = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
const num = v => (v === null || v === undefined ? null : typeof v === 'bigint' ? Number(v) : v);
const money = v => (v === null || v === undefined ? null : Math.round(v * 100) / 100);

const shas = {};
const trips = [];
let sourceRows = 0;
for (const month of ['01', '02', '03']) {
  const name = `yellow_tripdata_2025-${month}.parquet`;
  const file = path.join(dir, name);
  shas[name] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (shas[name] !== SOURCES[name].sha256) throw new Error(`${name}: unexpected hash`);
  const buffer = await asyncBufferFromFile(file);
  const total = Number((await parquetMetadataAsync(buffer)).num_rows);
  const CHUNK = 400_000;
  for (let start = 0; start < total; start += CHUNK) {
    const rows = await parquetReadObjects({ file: buffer, rowStart: start, rowEnd: Math.min(total, start + CHUNK), compressors });
    rows.forEach((r, i) => {
      const n = start + i;
      if (hash32(`2025-${month}:${n}`) % 10000 >= SAMPLE_PER_10K) return;
      const surcharge = money((r.extra ?? 0) + (r.mta_tax ?? 0) + (r.improvement_surcharge ?? 0));
      trips.push([
        num(r.VendorID), local(r.tpep_pickup_datetime), local(r.tpep_dropoff_datetime), num(r.passenger_count),
        r.trip_distance, num(r.RatecodeID), r.store_and_fwd_flag ?? null, r.PULocationID, r.DOLocationID, num(r.payment_type),
        money(r.fare_amount), money(r.tip_amount), money(r.tolls_amount), surcharge, money(r.congestion_surcharge),
        money(r.Airport_fee), money(r.cbd_congestion_fee), money(r.total_amount),
      ]);
    });
    sourceRows += rows.length;
  }
  console.log(`${name}: ${trips.length} sampled of ${sourceRows}`);
}
trips.sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));

const zoneText = fs.readFileSync(path.join(dir, 'taxi_zone_lookup.csv'), 'utf8');
shas['taxi_zone_lookup.csv'] = createHash('sha256').update(zoneText).digest('hex');
const zones = [...csvRows(zoneText)].slice(1).filter(r => r.length === 4).map(r => [Number(r[0]), r[2], r[1], r[3]]);

const out = path.join(path.dirname(new URL(import.meta.url).pathname), '../mobility/extract');
writeExtract(path.join(out, 'trips.tsv.gz'), ['trip_id', 'vendor_id', 'pickup_at', 'dropoff_at', 'passenger_count', 'trip_distance_miles', 'rate_code_id', 'store_and_fwd_flag', 'pickup_zone_id', 'dropoff_zone_id', 'payment_type_id', 'fare_amount', 'tip_amount', 'tolls_amount', 'surcharge_amount', 'congestion_surcharge', 'airport_fee', 'cbd_congestion_fee', 'total_amount'], trips.map((t, i) => [i + 1, ...t]));
writeExtract(path.join(out, 'zones.tsv.gz'), ['zone_id', 'zone_name', 'borough', 'service_zone'], zones);
fs.writeFileSync(path.join(out, '../source.json'), JSON.stringify({ files: shas, sourceRows, samplePer10k: SAMPLE_PER_10K, window: ['2025-01-01', '2025-03-31'], extracted: { trips: trips.length, zones: zones.length } }, null, 2) + '\n');
console.log({ sourceRows, trips: trips.length, zones: zones.length });
