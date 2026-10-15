import { col, fk, table } from '../lib/schema.mjs';
import { createRng, hash32, ts, ms, DAY, HOUR, MINUTE, round2 } from '../lib/rng.mjs';
import { COMPANY_A, COMPANY_B, US_CITIES } from '../lib/names.mjs';
import { distinct, maxShare } from '../lib/contract.mjs';

const SEED = 20256;
const GENERATOR_VERSION = '3.0.0';
const START = ms('2025-01-01 00:00:00');
const END = ms('2025-05-01 00:00:00');
const SHIPMENTS = 8200;

const SERVICE_LEVELS = [
  [1, 'GND', 'Ground', 5, 0], [2, 'ECO', 'Ground Economy', 7, 0], [3, '2DA', '2-Day', 2, 0], [4, 'NDA', 'Next Day Air', 1, 1],
  [5, 'SDY', 'Same Day', 0, 1], [6, 'LTL', 'Freight LTL', 6, 1], [7, 'INT', 'International Priority', 4, 1], [8, 'RTN', 'Returns', 8, 0],
];
const CARRIERS = [
  [1, 'Swiftline Parcel', 'parcel', 95], [2, 'NorthStar Express', 'parcel', 96], [3, 'Bluewater Logistics', 'regional', 92], [4, 'Prairie Courier', 'regional', 90],
  [5, 'Granite Freight', 'ltl', 88], [6, 'Metro Dash', 'courier', 97], [7, 'Atlas Air Cargo', 'air', 97], [8, 'Pinecrest Delivery', 'regional', 91],
  [9, 'Harborline Freight', 'ltl', 86], [10, 'Redwood Parcel', 'parcel', 93], [11, 'Summit Courier', 'courier', 95], [12, 'Coastal Connect', 'regional', 89],
  [13, 'Ironbridge Carriers', 'ltl', 87], [14, 'Lumen Last Mile', 'courier', 94],
];
const HUBS = [['Columbus', 'OH'], ['Memphis', 'TN'], ['Dallas', 'TX'], ['Atlanta', 'GA'], ['Chicago', 'IL'], ['Phoenix', 'AZ'], ['Sacramento', 'CA'], ['Newark', 'NJ']];
const STATIONS = [['New York', 'NY'], ['Los Angeles', 'CA'], ['Houston', 'TX'], ['Philadelphia', 'PA'], ['San Diego', 'CA'], ['Seattle', 'WA'], ['Denver', 'CO'], ['Boston', 'MA'],
  ['Miami', 'FL'], ['Minneapolis', 'MN'], ['Detroit', 'MI'], ['Portland', 'OR'], ['Charlotte', 'NC'], ['Nashville', 'TN'], ['Las Vegas', 'NV'], ['Baltimore', 'MD'],
  ['Kansas City', 'MO'], ['Salt Lake City', 'UT'], ['Raleigh', 'NC'], ['Pittsburgh', 'PA'], ['St. Louis', 'MO'], ['Orlando', 'FL'], ['San Antonio', 'TX'], ['Hartford', 'CT']];
const FULFILLMENT = [['Columbus', 'OH'], ['Dallas', 'TX'], ['Sacramento', 'CA'], ['Newark', 'NJ'], ['Atlanta', 'GA'], ['Chicago', 'IL']];
const ZIP_PREFIX = { NY: '100', CA: '9', TX: '7', PA: '19', WA: '98', CO: '80', MA: '021', FL: '33', MN: '55', MI: '48', OR: '97', NC: '27', TN: '37', NV: '89', MD: '21', MO: '63', UT: '84', CT: '061', OH: '43', GA: '30', IL: '60', AZ: '85', NJ: '071' };
const FAIL_OUTCOMES = [['recipient_absent', 45], ['no_access', 25], ['address_issue', 18], ['refused', 7], ['damaged', 5]];
const NOTES = { recipient_absent: ['No one home, left notice', 'Recipient not available', 'nobody home - notice left', 'Customer unavailable'], no_access: ['Gate code needed', 'Building locked', 'No access to lobby', 'gated community, no code'], address_issue: ['Address not found', 'Incorrect apt number', 'Street name mismatch', 'Business closed'], refused: ['Recipient refused package', 'Refused - wrong item'], damaged: ['Box crushed', 'Package damaged in transit'] };

const tables = [
  table('service_levels', 'One shipping service with its delivery promise.', [
    col('service_level_id', 'INTEGER', 'Service key'),
    col('service_code', 'TEXT', 'Short code'),
    col('service_name', 'TEXT', 'Service name'),
    col('promised_business_days', 'INTEGER', 'Business days from pickup to promised delivery (0 = same day)'),
    col('signature_required', 'INTEGER', '1 when delivery needs a signature'),
  ]),
  table('carriers', 'One fictional transport carrier.', [
    col('carrier_id', 'INTEGER', 'Carrier key'),
    col('carrier_name', 'TEXT', 'Carrier name'),
    col('carrier_type', 'TEXT', 'parcel, regional, ltl, courier or air'),
    col('on_time_target_pct', 'INTEGER', 'Contracted on-time delivery target, percent'),
  ]),
  table('warehouses', 'One facility in the network: fulfillment center, sort hub, or delivery station.', [
    col('warehouse_id', 'INTEGER', 'Facility key'),
    col('warehouse_code', 'TEXT', 'Facility code'),
    col('facility_type', 'TEXT', 'fulfillment, sortation or delivery_station'),
    col('city', 'TEXT', 'City'),
    col('state', 'TEXT', 'State'),
    col('opened_at', 'TEXT', 'Opening date'),
  ]),
  table('routes', 'One scheduled truck lane between two facilities.', [
    col('route_id', 'INTEGER', 'Lane key'),
    col('origin_warehouse_id', 'INTEGER', 'Departure facility'),
    col('destination_warehouse_id', 'INTEGER', 'Arrival facility'),
    col('carrier_id', 'INTEGER', 'Carrier operating the lane'),
    col('typical_transit_hours', 'INTEGER', 'Planned transit time'),
    col('distance_miles', 'INTEGER', 'Road distance'),
  ], { foreignKeys: [fk('origin_warehouse_id', 'warehouses', 'warehouse_id'), fk('destination_warehouse_id', 'warehouses', 'warehouse_id'), fk('carrier_id', 'carriers')] }),
  table('shipments', 'One customer order shipped as one or more packages.', [
    col('shipment_id', 'INTEGER', 'Shipment key'),
    col('order_reference', 'TEXT', 'Shipper’s order number'),
    col('shipper_name', 'TEXT', 'Sending business as typed on the label (inconsistent case and spacing)'),
    col('origin_warehouse_id', 'INTEGER', 'Fulfillment center'),
    col('destination_city', 'TEXT', 'Recipient city'),
    col('destination_state', 'TEXT', 'Recipient state'),
    col('destination_postal_code', 'TEXT', 'Recipient ZIP as entered: may lose leading zeros, include ZIP+4, or be missing', true),
    col('service_level_id', 'INTEGER', 'Service purchased'),
    col('carrier_id', 'INTEGER', 'Final-mile carrier'),
    col('created_at', 'TEXT', 'Label created (UTC)'),
    col('promised_delivery_date', 'TEXT', 'Promised delivery date'),
    col('declared_value', 'REAL', 'Declared value in USD'),
  ], { foreignKeys: [fk('origin_warehouse_id', 'warehouses', 'warehouse_id'), fk('service_level_id', 'service_levels'), fk('carrier_id', 'carriers')], indexes: [['created_at'], ['carrier_id']] }),
  table('packages', 'One physical package within a shipment.', [
    col('package_id', 'INTEGER', 'Package key'),
    col('shipment_id', 'INTEGER', 'Shipment'),
    col('tracking_number', 'TEXT', 'Tracking number as scanned (case and spacing vary)'),
    col('package_type', 'TEXT', 'box, envelope, tube or pallet'),
    col('weight_kg', 'REAL', 'Weight in kg'),
    col('length_cm', 'INTEGER', 'Length in cm'),
    col('width_cm', 'INTEGER', 'Width in cm'),
    col('height_cm', 'INTEGER', 'Height in cm'),
  ], { foreignKeys: [fk('shipment_id', 'shipments')], indexes: [['shipment_id']] }),
  table('tracking_events', 'One package scan or status update. Scans can repeat, go missing, arrive late, or show up out of order.', [
    col('event_id', 'INTEGER', 'Ingestion key'),
    col('package_id', 'INTEGER', 'Package'),
    col('event_type', 'TEXT', 'What happened (picked up, in transit, delivered, exception, and similar)'),
    col('event_at', 'TEXT', 'When the scan happened (UTC)'),
    col('recorded_at', 'TEXT', 'When the platform received it (UTC)'),
    col('warehouse_id', 'INTEGER', 'Facility for facility scans; NULL on the road', true),
    col('event_source', 'TEXT', 'scanner, driver_app, carrier_api or manual'),
    col('exception_code', 'TEXT', 'Reason on exception, rerouted and returned_to_sender events; NULL otherwise', true),
    col('driver_id', 'INTEGER', 'Courier on out_for_delivery, delivery_failed and delivered events; NULL otherwise', true),
  ], { foreignKeys: [fk('package_id', 'packages'), fk('warehouse_id', 'warehouses')], indexes: [['package_id', 'event_at'], ['event_type'], ['event_at']] }),
  table('delivery_attempts', 'One attempt by a driver to deliver a package.', [
    col('attempt_id', 'INTEGER', 'Attempt key'),
    col('package_id', 'INTEGER', 'Package'),
    col('attempt_number', 'INTEGER', '1 for the first attempt'),
    col('attempted_at', 'TEXT', 'Attempt time (UTC)'),
    col('outcome', 'TEXT', 'delivered, recipient_absent, no_access, address_issue, refused or damaged'),
    col('driver_note', 'TEXT', 'Free-text note typed by the driver; NULL for most deliveries', true),
  ], { foreignKeys: [fk('package_id', 'packages')], indexes: [['package_id']] }),
];

function addBusinessDays(t, days) {
  let d = Math.floor(t / DAY) * DAY, n = 0;
  if (days === 0) return d;
  while (n < days) { d += DAY; const w = new Date(d).getUTCDay(); if (w !== 0 && w !== 6) n++; }
  return d;
}

function generate() {
  const rng = createRng(SEED);
  const warehouses = [], routes = [], shipments = [], packages = [], events = [], attempts = [];
  const addWarehouse = (type, [city, state], prefix) => {
    const id = warehouses.length + 1;
    warehouses.push([id, `${prefix}${state}${id}`, type, city, state, ts(ms('2016-01-01 00:00:00') + rng.int(0, 3000) * DAY).slice(0, 10)]);
    return { id, city, state, type };
  };
  const fcs = FULFILLMENT.map(c => addWarehouse('fulfillment', c, 'F'));
  const hubs = HUBS.map(c => addWarehouse('sortation', c, 'S'));
  const stations = STATIONS.map(c => addWarehouse('delivery_station', c, 'D'));
  const lane = new Map();
  const addRoute = (a, b, carrier, hours) => {
    const key = `${a.id}-${b.id}`;
    if (lane.has(key)) return lane.get(key);
    const id = routes.length + 1;
    routes.push([id, a.id, b.id, carrier, hours, Math.round(hours * rng.float(42, 55))]);
    lane.set(key, id);
    return id;
  };
  for (const f of fcs) for (const h of hubs) addRoute(f, h, rng.pick([1, 2, 3, 5, 9, 13]), rng.int(4, 40));
  for (const h of hubs) for (const h2 of hubs) if (h !== h2 && rng.chance(0.6)) addRoute(h, h2, rng.pick([5, 9, 13, 7]), rng.int(6, 36));
  for (const h of hubs) for (const s of stations) if (rng.chance(0.55)) addRoute(h, s, rng.pick([1, 2, 3, 4, 8, 10, 12]), rng.int(3, 30));
  const hubToStation = s => hubs.filter(h => lane.has(`${h.id}-${s.id}`));
  const shippers = Array.from({ length: 70 }, () => `${rng.pick(COMPANY_A)} ${rng.pick(COMPANY_B)}`);
  const messyName = (r, name) => r.weighted([[name, 70], [name.toUpperCase(), 12], [name.toLowerCase(), 6], [` ${name}`, 4], [`${name}  `, 4], [name.replace(' ', '  '), 4]]);

  let pkgSeq = 0;
  const pending = [];
  for (let s = 0; s < SHIPMENTS; s++) {
    const r = rng.fork(`shipment:${s}`);
    const id = s + 1;
    const created = START + Math.floor(r.next() * (END - START - 2 * DAY));
    const service = r.weighted([[1, 46], [2, 14], [3, 18], [4, 8], [5, 2], [6, 4], [7, 3], [8, 5]]);
    const origin = r.pick(fcs);
    const station = r.weighted(stations.map(st => [st, US_CITIES.find(c => c[0] === st.city)?.[2] ?? 2]));
    const carrier = service === 6 ? r.pick([5, 9, 13]) : service === 5 ? r.pick([6, 11, 14]) : service === 4 || service === 7 ? r.pick([7, 1, 2]) : r.pick([1, 2, 3, 4, 8, 10, 12]);
    const prefix = ZIP_PREFIX[station.state] ?? '5';
    let zip = (prefix + String(r.int(0, 99999)).padStart(5, '0')).slice(0, 5);
    const zr = r.next();
    if (zr < 0.05 && zip.startsWith('0')) zip = zip.replace(/^0+/, '');
    else if (zr < 0.09) zip = `${zip}-${String(r.int(0, 9999)).padStart(4, '0')}`;
    else if (zr < 0.1) zip = null;
    const promised = addBusinessDays(created + 6 * HOUR, SERVICE_LEVELS[service - 1][3]);
    shipments.push([id, `ORD-${100000 + r.int(0, 899999)}`, messyName(r, r.pick(shippers)), origin.id, station.city, station.state, zip, service, carrier, ts(created), ts(promised).slice(0, 10), round2(r.lognormal(85, 1))]);

    const nPkg = service === 6 ? r.int(1, 4) : r.weighted([[1, 75], [2, 17], [3, 6], [4, 2]]);
    for (let k = 0; k < nPkg; k++) {
      const pid = ++pkgSeq;
      const type = service === 6 ? 'pallet' : r.weighted([['box', 78], ['envelope', 15], ['tube', 7]]);
      const base = `RT${String(100000000 + pid * 7919 % 900000000).slice(0, 9)}${String.fromCharCode(65 + (pid % 26))}`;
      const tr = r.next();
      const tracking = tr < 0.06 ? base.toLowerCase() : tr < 0.1 ? `${base.slice(0, 4)} ${base.slice(4, 8)} ${base.slice(8)}` : tr < 0.12 ? ` ${base}` : base;
      const w = type === 'pallet' ? r.float(150, 600) : type === 'envelope' ? r.float(0.05, 0.6) : r.lognormal(2.2, 0.8);
      const dims = type === 'pallet' ? [120, 100, r.int(80, 180)] : type === 'envelope' ? [32, 24, r.int(1, 3)] : type === 'tube' ? [r.int(60, 120), 10, 10] : [r.int(15, 70), r.int(12, 50), r.int(5, 45)];
      packages.push([pid, id, tracking, type, round2(w), ...dims]);

      // Physical journey.
      const ev = [];
      const add = (t, type2, wh, source = 'scanner') => ev.push({ t, type: type2, wh, source });
      add(created, 'created', null, 'manual');
      let t = created + r.int(2, 30) * HOUR;
      if (service === 5) t = created + r.int(1, 3) * HOUR;
      add(t, 'picked_up', origin.id);
      const candidateHubs = hubToStation(station);
      const hub = candidateHubs.length ? r.pick(candidateHubs) : r.pick(hubs);
      const path = service === 5 ? [] : r.chance(0.25) ? [r.pick(hubs.filter(h => h !== hub)), hub] : [hub];
      t += r.int(1, 6) * HOUR;
      add(t, 'warehouse_departure', origin.id);
      let lost = r.chance(0.003);
      for (const h of path) {
        const transit = (service === 4 || service === 7 ? r.int(3, 10) : r.int(8, 40)) * HOUR * (r.chance(0.04) ? r.float(1.5, 3) : 1);
        if (r.chance(0.2)) add(t + transit / 2, 'in_transit', null, 'carrier_api');
        t += transit;
        if (lost) break;
        add(t, 'warehouse_arrival', h.id);
        t += r.int(2, 14) * HOUR;
        add(t, 'warehouse_departure', h.id);
      }
      if (lost) { add(t + 3 * DAY, 'exception', null, 'manual'); } else {
        let dest = station;
        if (r.chance(0.012)) { // address correction reroutes to another station
          const alt = r.pick(stations.filter(x => x !== station));
          add(t + HOUR, 'rerouted', null, 'carrier_api');
          t += r.int(12, 36) * HOUR;
          dest = alt;
        }
        t += r.int(4, 20) * HOUR;
        add(t, 'warehouse_arrival', dest.id);
        let attempt = 0, delivered = false;
        // Deliveries go out the next morning (local ~08:00–11:00 ≈ 13:00–16:00 UTC).
        let day = Math.floor(t / DAY) * DAY + (new Date(t).getUTCHours() >= 12 ? DAY : 0);
        while (attempt < 3 && !delivered) {
          while ([0, 6].includes(new Date(day).getUTCDay()) && service !== 5) day += DAY;
          const out = day + r.int(12, 15) * HOUR + r.int(0, 59) * MINUTE;
          add(out, 'out_for_delivery', dest.id);
          const at = out + r.int(1, 9) * HOUR + r.int(0, 59) * MINUTE;
          attempt++;
          const success = r.chance(attempt === 1 ? 0.9 : 0.8);
          const outcome = success ? 'delivered' : r.weighted(FAIL_OUTCOMES);
          const note = success ? (r.chance(0.08) ? r.pick(['Left at front door', 'Handed to resident', 'left w/ front desk', 'Placed in parcel locker']) : null) : r.pick(NOTES[outcome]);
          attempts.push([0, pid, attempt, ts(at), outcome, note]);
          if (success) { add(at, 'delivered', null, 'driver_app'); delivered = true; }
          else {
            add(at, 'delivery_failed', null, 'driver_app');
            if (outcome === 'refused' || outcome === 'damaged') break;
            day = Math.floor(at / DAY) * DAY + DAY;
          }
        }
        if (!delivered) add(day + 2 * DAY, 'returned_to_sender', dest.id, 'manual');
      }
      // Ingestion problems.
      const kept = [];
      for (const e of ev) {
        if (e.type !== 'created' && e.type !== 'delivered' && e.type !== 'delivery_failed' && r.chance(0.05)) continue; // missing scan
        if (e.t >= END) continue;
        let recorded = e.t + r.int(5, 240) * 1000;
        if (e.source === 'carrier_api' || r.chance(0.04)) recorded = e.t + r.int(1, 18) * HOUR; // batch feed or offline scanner
        kept.push({ ...e, recorded: Math.min(recorded, END - 1000) });
        if (e.source === 'scanner' && r.chance(0.035)) kept.push({ ...e, t: e.t + r.int(1, 15) * MINUTE, recorded: Math.min(recorded + r.int(1, 20) * MINUTE, END - 1000) }); // duplicate scan
      }
      if (r.chance(0.006)) { const d = kept.find(e => e.type === 'delivered'); if (d) kept.push({ ...d, type: 'out_for_delivery', t: d.t + r.int(5, 40) * MINUTE, recorded: Math.min(d.recorded + HOUR, END - 1000), source: 'driver_app' }); }
      for (const e of kept) pending.push([0, pid, e.type, ts(e.t), ts(e.recorded), e.wh, e.source, e.recorded]);
    }
  }
  pending.sort((a, b) => a[7] - b[7] || a[1] - b[1]);
  // Exception reasons and couriers come from stable hashes, so they never shift the events above.
  const EXCEPTIONS = ['not_found', 'not_found', 'damaged', 'misrouted'];
  const RETURNS = ['refused', 'undeliverable_address', 'max_attempts'];
  pending.forEach((p, i) => {
    const [, pid, type, at] = p;
    const h = hash32(`${pid}|${type}|${at}`);
    const exception = type === 'exception' ? EXCEPTIONS[h % EXCEPTIONS.length] : type === 'rerouted' ? 'address_correction' : type === 'returned_to_sender' ? RETURNS[h % RETURNS.length] : null;
    const driver = ['out_for_delivery', 'delivery_failed', 'delivered'].includes(type) ? 1 + (hash32(`${pid}|${at.slice(0, 10)}`) % 420) : null;
    events.push([i + 1, pid, type, at, p[4], p[5], p[6], exception, driver]);
  });
  attempts.forEach((a, i) => { a[0] = i + 1; });
  return { service_levels: SERVICE_LEVELS, carriers: CARRIERS, warehouses, routes, shipments, packages, tracking_events: events, delivery_attempts: attempts };
}

const dataset = {
  id: 'logistics',
  version: '3.0.0',
  name: 'Logistics',
  domain: 'Parcel delivery',
  kind: 'synthetic',
  description: 'Four months of a fictional parcel network: shipments and packages moving from fulfillment centers through sortation hubs to delivery stations, with every scan, delivery attempt and return.',
  source: {
    publisher: 'Runtime',
    url: 'https://github.com/KrishnaSathvik/runtime.school',
    release: `Runtime logistics generator ${GENERATOR_VERSION}, seed ${SEED}`,
    license: 'Runtime-owned synthetic data',
    licenseUrl: 'https://github.com/KrishnaSathvik/runtime.school',
    commercialReuse: 'permitted',
    attribution: 'Synthetic data generated by Runtime.',
    retrieved: '2026-10-14',
    transformations: [
      'Each package follows a physical path: pickup, origin departure, one or two hubs, delivery station, out for delivery, attempts.',
      'About 5% of intermediate scans are missing, 3.5% of scanner events repeat, carrier API events arrive in delayed batches.',
      'Failed attempts are retried on business days; three failures, a refusal or damage return the package to sender.',
      'Shipper names, tracking numbers and postal codes are entered inconsistently on purpose.',
    ],
  },
  reproduction: { command: 'node datasets/build.mjs logistics', implementation: 'datasets/logistics/dataset.mjs', seed: SEED, notes: `Generator version ${GENERATOR_VERSION}; deterministic for a given seed.` },
  coverage: { start: '2025-01-01', end: '2025-04-30', grain: 'tracking event' },
  tables,
  edgeCases: [
    'Duplicate scans of the same step',
    'Missing intermediate scans',
    'Late, batched and out-of-order ingestion (recorded_at)',
    'A scan recorded after delivery (out_for_delivery after delivered)',
    'Reroutes to a different delivery station',
    'Failed attempts, returns to sender and lost packages',
    'Packages still in transit at the end of the data',
    'Messy shipper names, tracking numbers and postal codes',
  ],
  qualityNotes: [
    'The latest state of a package is its most recent event by event_at, not by event_id.',
    'Normalize tracking numbers with UPPER and REPLACE before matching.',
    'promised_delivery_date counts business days from label creation.',
  ],
  concepts: ['latest row per group', 'ROW_NUMBER', 'date differences', 'SLA', 'string cleaning', 'validation', 'constraints', 'FULL OUTER JOIN', 'deduplication'],
  rows: () => generate(),
  mutation: `
DELETE FROM tracking_events WHERE event_id % 103 = 0;
INSERT INTO tracking_events SELECT (SELECT MAX(event_id) FROM tracking_events) + event_id, package_id, event_type, datetime(event_at, '+4 minutes'), datetime(recorded_at, '+9 minutes'), warehouse_id, event_source, exception_code, driver_id FROM tracking_events WHERE event_id % 277 = 0;
UPDATE tracking_events SET event_at = datetime(event_at, '+1 day') WHERE event_type = 'delivered' AND event_id % 59 = 0;
UPDATE delivery_attempts SET outcome = 'recipient_absent', driver_note = 'No one home' WHERE attempt_id % 211 = 0 AND outcome = 'delivered';
UPDATE shipments SET destination_postal_code = NULL WHERE shipment_id % 149 = 0;
UPDATE packages SET tracking_number = lower(tracking_number) WHERE package_id % 83 = 0;
UPDATE shipments SET promised_delivery_date = date(promised_delivery_date, '-1 day') WHERE shipment_id % 37 = 0;
UPDATE packages SET weight_kg = weight_kg + 1.5 WHERE shipment_id = 6;
UPDATE tracking_events SET event_at = datetime(event_at, '+20 minutes') WHERE package_id = 5 AND event_type = 'warehouse_departure';
`,
  contract: {
    totalRows: [100000, 150000],
    minRows: { service_levels: 8, carriers: 12, warehouses: 35, routes: 150, shipments: 7500, packages: 10000, tracking_events: 70000, delivery_attempts: 9000 },
    checks: [
      { name: 'months covered', sql: "SELECT COUNT(DISTINCT substr(created_at, 1, 7)) FROM shipments", equals: 4 },
      { name: 'event types', sql: distinct('tracking_events', 'event_type'), equals: 11 },
      { name: 'exception reasons', sql: distinct('tracking_events', 'exception_code'), min: 5 },
      { name: 'couriers on delivery events', sql: distinct('tracking_events', 'driver_id'), min: 300 },
      { name: 'reasons only on exception-type events', sql: "SELECT COUNT(*) FROM tracking_events WHERE exception_code IS NOT NULL AND event_type NOT IN ('exception', 'rerouted', 'returned_to_sender')", equals: 0 },
      { name: 'largest package share of events', sql: maxShare('tracking_events', 'package_id'), max: 0.001 },
      { name: 'duplicate scans', sql: 'SELECT COUNT(*) FROM (SELECT 1 FROM tracking_events GROUP BY package_id, event_type, warehouse_id HAVING COUNT(*) > 1 AND event_type NOT IN (\'out_for_delivery\', \'delivery_failed\', \'warehouse_arrival\', \'warehouse_departure\'))', min: 0 },
      { name: 'repeated scanner events within 15 minutes', sql: 'SELECT COUNT(*) FROM (SELECT package_id, event_type, event_at, LAG(event_at) OVER (PARTITION BY package_id, event_type, warehouse_id ORDER BY event_at) AS prev FROM tracking_events) WHERE (julianday(event_at) - julianday(prev)) * 1440 <= 15', min: 1000 },
      { name: 'late ingestion (> 1 hour)', sql: "SELECT COUNT(*) FROM tracking_events WHERE julianday(recorded_at) - julianday(event_at) > 1.0 / 24", min: 3000 },
      { name: 'out-of-order ingestion within a package', sql: 'SELECT COUNT(*) FROM (SELECT event_at, LAG(event_at) OVER (PARTITION BY package_id ORDER BY recorded_at, event_id) AS prev FROM tracking_events) WHERE event_at < prev', min: 1000 },
      { name: 'packages with failed attempts', sql: "SELECT COUNT(DISTINCT package_id) FROM delivery_attempts WHERE outcome <> 'delivered'", min: 800 },
      { name: 'returned packages', sql: "SELECT COUNT(DISTINCT package_id) FROM tracking_events WHERE event_type = 'returned_to_sender'", min: 30 },
      { name: 'rerouted packages', sql: "SELECT COUNT(DISTINCT package_id) FROM tracking_events WHERE event_type = 'rerouted'", min: 50 },
      { name: 'packages never delivered', sql: "SELECT COUNT(*) FROM packages p WHERE NOT EXISTS (SELECT 1 FROM tracking_events e WHERE e.package_id = p.package_id AND e.event_type = 'delivered')", min: 200 },
      { name: 'messy tracking numbers', sql: "SELECT COUNT(*) FROM packages WHERE tracking_number <> UPPER(REPLACE(tracking_number, ' ', ''))", min: 500 },
      { name: 'postal codes needing repair', sql: "SELECT COUNT(*) FROM shipments WHERE destination_postal_code IS NULL OR length(destination_postal_code) <> 5", min: 500 },
      { name: 'shipper name variants', sql: "SELECT COUNT(*) - COUNT(DISTINCT UPPER(TRIM(REPLACE(shipper_name, '  ', ' ')))) FROM (SELECT DISTINCT shipper_name FROM shipments)", min: 50 },
      { name: 'driver notes', sql: 'SELECT COUNT(driver_note) FROM delivery_attempts', min: 1000 },
    ],
  },
};

export default dataset;
