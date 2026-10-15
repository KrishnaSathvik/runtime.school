import { col, fk, table } from '../lib/schema.mjs';
import { createRng, hash32, ts, ms, DAY, HOUR, MINUTE, round2 } from '../lib/rng.mjs';
import { FIRST_NAMES, LAST_NAMES } from '../lib/names.mjs';
import { distinct, maxShare, nulls } from '../lib/contract.mjs';

const SEED = 20255;
const GENERATOR_VERSION = '3.0.0';
const START = ms('2025-03-01 00:00:00');
const END = ms('2025-05-01 00:00:00');

/** [id, name, unit, valid_min, valid_max, alert_low, alert_high] */
const SENSOR_TYPES = [
  [1, 'cold_storage_temperature', 'degC', -30, 40, null, 8], [2, 'room_temperature', 'degC', -10, 50, 16, 28], [3, 'humidity', '%RH', 0, 100, 20, 70],
  [4, 'co2', 'ppm', 350, 5000, null, 1500], [5, 'power', 'kW', 0, 500, null, 320], [6, 'vibration', 'mm/s', 0, 50, null, 7.1],
  [7, 'water_pressure', 'kPa', 0, 1000, 250, 650], [8, 'freezer_temperature', 'degC', -40, 30, null, -12], [9, 'pm25', 'ug/m3', 0, 1000, null, 35],
  [10, 'battery_voltage', 'V', 0, 5, 3.3, null],
];
const SITES = [
  ['Riverside Distribution Center', 'Columbus', 'America/New_York', ['Cold Room A', 'Cold Room B', 'Freezer 1', 'Dock', 'Office']],
  ['Northgate Plant', 'Milwaukee', 'America/Chicago', ['Line 1', 'Line 2', 'Line 3', 'Compressor Room', 'Office', 'Warehouse']],
  ['Harbor Labs', 'San Diego', 'America/Los_Angeles', ['Lab 101', 'Lab 102', 'Server Room', 'Office', 'Cold Room']],
  ['Summit Tower', 'Denver', 'America/Denver', ['Floor 3 East', 'Floor 3 West', 'Floor 7', 'Floor 12', 'Lobby', 'Mechanical']],
  ['Lakeside Hospital Annex', 'Minneapolis', 'America/Chicago', ['Pharmacy Fridge Room', 'Freezer Bank', 'Ward 2', 'Ward 3', 'Plant Room']],
  ['Mesa Fulfillment Hub', 'Phoenix', 'America/Phoenix', ['Pick Zone', 'Cold Room', 'Freezer 2', 'Charging Bay', 'Office', 'Roof Plant']],
  ['Bayview Water Station', 'Tampa', 'America/New_York', ['Pump Hall', 'Intake', 'Control Room', 'Reservoir']],
  ['Granite Data Hall', 'Reno', 'America/Los_Angeles', ['Hall A', 'Hall B', 'UPS Room', 'Office']],
];
const ZONE_SENSORS = {
  'Cold Room': [1, 1, 3], Freezer: [8, 8], Office: [2, 4, 3], Line: [5, 6, 6], 'Compressor Room': [6, 7, 5], Warehouse: [2, 3, 9], Lab: [2, 3, 4], 'Server Room': [2, 3, 5],
  Floor: [2, 4, 4, 3], Lobby: [2, 4, 9], Mechanical: [7, 6], Pharmacy: [1, 1], Ward: [2, 4, 3], 'Plant Room': [7, 6, 5], Dock: [2, 9], 'Pick Zone': [2, 9], 'Charging Bay': [5, 10, 10],
  'Roof Plant': [6, 7], 'Pump Hall': [7, 7, 6, 5], Intake: [7, 9], 'Control Room': [2, 4], Reservoir: [7, 10], Hall: [2, 3, 5], 'UPS Room': [5, 2, 10],
};
const MODELS = { 1: ['ThermoTag T2', 'ColdSense 400'], 2: ['EnviroNode E1', 'RoomSense 3'], 3: ['EnviroNode E1', 'HygroPro'], 4: ['AirQ CO2-X'], 5: ['PowerLink PM7'], 6: ['VibeGuard V3'], 7: ['FlowSure P20'], 8: ['ThermoTag T2-F'], 9: ['AirQ PM25'], 10: ['CellWatch B1'] };
const INTERVAL = { 1: 60, 2: 120, 3: 120, 4: 120, 5: 60, 6: 240, 7: 120, 8: 60, 9: 240, 10: 360 };

const tables = [
  table('locations', 'One monitored zone inside a site.', [
    col('location_id', 'INTEGER', 'Location key'),
    col('site_name', 'TEXT', 'Facility'),
    col('zone_name', 'TEXT', 'Room or area within the site'),
    col('city', 'TEXT', 'City'),
    col('timezone', 'TEXT', 'IANA time zone of the site'),
  ]),
  table('sensor_types', 'One kind of measurement (for example temperature), including valid ranges and alert thresholds.', [
    col('sensor_type_id', 'INTEGER', 'Sensor type key'),
    col('type_name', 'TEXT', 'Measurement'),
    col('unit', 'TEXT', 'Unit of measure'),
    col('valid_min', 'REAL', 'Lowest physically plausible value'),
    col('valid_max', 'REAL', 'Highest physically plausible value'),
    col('alert_low', 'REAL', 'Alert when the value falls below this; NULL if no low threshold', true),
    col('alert_high', 'REAL', 'Alert when the value rises above this; NULL if no high threshold', true),
  ]),
  table('devices', 'One installed sensor device.', [
    col('device_id', 'INTEGER', 'Device key'),
    col('serial_number', 'TEXT', 'Manufacturer serial'),
    col('sensor_type_id', 'INTEGER', 'What it measures'),
    col('location_id', 'INTEGER', 'Where it is installed'),
    col('model', 'TEXT', 'Hardware model'),
    col('firmware_version', 'TEXT', 'Firmware at the end of the period'),
    col('reporting_interval_minutes', 'INTEGER', 'Expected minutes between readings'),
    col('installed_at', 'TEXT', 'Installation time (UTC)'),
    col('retired_at', 'TEXT', 'Removal time; NULL while in service', true),
  ], { foreignKeys: [fk('sensor_type_id', 'sensor_types'), fk('location_id', 'locations')] }),
  table('sensor_readings', 'One sensor reading. The same reading can arrive more than once when a device retransmits.', [
    col('reading_id', 'INTEGER', 'Ingestion key'),
    col('device_id', 'INTEGER', 'Device'),
    col('sequence_number', 'INTEGER', 'Device message counter'),
    col('recorded_at', 'TEXT', 'Measurement time on the device clock (UTC)'),
    col('received_at', 'TEXT', 'Platform ingestion time (UTC); late when the device buffered offline'),
    col('value', 'REAL', 'Measured value in the type’s unit; NULL when the sensor reported a fault', true),
    col('battery_pct', 'INTEGER', 'Battery level for battery-powered devices; NULL for mains-powered', true),
    col('gateway_id', 'INTEGER', 'Wireless gateway that relayed the reading; NULL for wired (mains-powered) devices', true),
    col('signal_rssi_dbm', 'INTEGER', 'Received signal strength at the gateway, dBm (closer to 0 is stronger); NULL for wired devices', true),
    col('quality_flag', 'TEXT', 'Platform check on arrival: ok, out_of_range (outside the sensor type’s valid range) or fault (no value)'),
  ], { foreignKeys: [fk('device_id', 'devices')], indexes: [['device_id', 'recorded_at'], ['recorded_at']] }),
  table('alerts', 'One alert period when a device went out of range or lost connectivity.', [
    col('alert_id', 'INTEGER', 'Alert key'),
    col('device_id', 'INTEGER', 'Device'),
    col('alert_type', 'TEXT', 'high_threshold, low_threshold, offline or low_battery'),
    col('severity', 'TEXT', 'warning or critical'),
    col('opened_at', 'TEXT', 'First reading or check that triggered the alert'),
    col('closed_at', 'TEXT', 'When the condition cleared; NULL if still open', true),
    col('peak_value', 'REAL', 'Most extreme value while open; NULL for connectivity alerts', true),
  ], { foreignKeys: [fk('device_id', 'devices')], indexes: [['device_id', 'opened_at']] }),
  table('maintenance', 'One maintenance visit for a device. Two technicians can log overlapping orders for the same visit.', [
    col('maintenance_id', 'INTEGER', 'Work order key'),
    col('device_id', 'INTEGER', 'Device serviced'),
    col('maintenance_type', 'TEXT', 'calibration, battery_replacement, repair, firmware_update or replacement'),
    col('technician', 'TEXT', 'Technician name'),
    col('started_at', 'TEXT', 'Work start (UTC)'),
    col('completed_at', 'TEXT', 'Work end; NULL if still open', true),
    col('cost', 'REAL', 'Cost in USD'),
  ], { foreignKeys: [fk('device_id', 'devices')], indexes: [['device_id']] }),
  table('device_status_events', 'One change in a device’s status. That status lasts until the next status event.', [
    col('status_event_id', 'INTEGER', 'Event key'),
    col('device_id', 'INTEGER', 'Device'),
    col('changed_at', 'TEXT', 'When the new state began (UTC)'),
    col('status', 'TEXT', 'online, offline, degraded, maintenance or retired'),
    col('reason', 'TEXT', 'Why the state changed', true),
  ], { foreignKeys: [fk('device_id', 'devices')], indexes: [['device_id', 'changed_at']] }),
];

function generate() {
  const rng = createRng(SEED);
  const locations = [], devices = [], readings = [], alerts = [], maintenance = [], status = [];
  const technicians = Array.from({ length: 9 }, () => `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`);
  for (const [site, city, tz, zones] of SITES) for (const zone of zones) locations.push([locations.length + 1, site, zone, city, tz]);
  const typeOf = Object.fromEntries(SENSOR_TYPES.map(t => [t[0], t]));
  // Devices per zone from its sensor mix; a few spares are never connected.
  for (const [locationId, , zone] of locations) {
    const key = Object.keys(ZONE_SENSORS).find(k => zone.startsWith(k)) ?? 'Office';
    // Larger zones carry redundant sensors of the same type.
    const copies = ['Cold Room', 'Freezer', 'Line', 'Floor', 'Hall', 'Pharmacy', 'Ward'].includes(key) ? 2 : 1;
    for (const typeId of ZONE_SENSORS[key].flatMap(t => Array(copies).fill(t))) {
      const r = rng.fork(`device:${devices.length}`);
      const installed = START - r.int(20, 900) * DAY;
      devices.push({ id: devices.length + 1, typeId, locationId, zone, installed, r, battery: [1, 8, 10, 9].includes(typeId) && r.chance(0.7) });
    }
  }
  const spares = 12;
  for (let i = 0; i < spares; i++) devices.push({ id: devices.length + 1, typeId: rng.pick([2, 3, 4]), locationId: rng.int(1, locations.length), zone: 'Spare', installed: START + rng.int(5, 50) * DAY, r: rng.fork(`spare:${i}`), spare: true, battery: false });

  let readingSeq = 0;
  const pendingReadings = [];
  for (const d of devices) {
    const r = d.r;
    const [typeId, name, , vmin, vmax, low, high] = typeOf[d.typeId];
    const interval = INTERVAL[d.typeId] * MINUTE;
    const firmware = r.pick(['2.3.1', '2.4.0', '2.4.2', '3.0.1']);
    const retired = !d.spare && r.chance(0.025) ? START + r.int(15, 55) * DAY : null;
    const statusLog = [];
    const setStatus = (t, s, reason) => { if (statusLog.at(-1)?.s !== s) statusLog.push({ t, s, reason }); };
    setStatus(Math.max(d.installed, START), d.spare ? 'offline' : 'online', d.installed >= START ? 'installed' : 'period start');
    // Offline windows: power or network loss. During network loss readings are buffered and sent later.
    const outages = [];
    const outageCount = d.spare ? 0 : r.poisson(2.2);
    for (let k = 0; k < outageCount; k++) {
      const s = START + r.int(1, 58) * DAY + r.int(0, 23) * HOUR;
      const len = Math.round(r.lognormal(5, 1)) * HOUR;
      outages.push({ s, e: Math.min(END - HOUR, s + len), buffered: r.chance(0.55) });
    }
    outages.sort((a, b) => a.s - b.s);
    // Failure episodes produce threshold violations; maintenance repairs them.
    const failure = !d.spare && ([1, 8].includes(typeId) ? r.chance(0.4) : typeId === 6 ? r.chance(0.5) : r.chance(0.18)) ? START + r.int(5, 55) * DAY + r.int(0, 23) * HOUR : null;
    const failureLen = failure ? r.int(4, 30) * HOUR : 0;
    const faultRate = r.chance(0.1) ? 0.03 : 0.002;
    let seq = r.int(1000, 90000);
    let battery = d.battery ? r.int(55, 100) : null;
    const drift = typeId === 6 && failure ? r.float(0.5, 1.5) : 0;
    let lastValue = null;
    const begin = Math.max(START, d.installed);
    const stop = Math.min(END, retired ?? END);
    if (!d.spare) for (let t = begin + r.int(0, Math.max(1, interval / MINUTE - 1)) * MINUTE; t < stop; t += interval) {
      const outage = outages.find(o => t >= o.s && t < o.e);
      if (outage && !outage.buffered) continue;
      if (r.chance(0.012)) continue; // single dropped message
      const hour = new Date(t).getUTCHours(), dow = new Date(t).getUTCDay();
      const work = dow >= 1 && dow <= 5 && hour >= 13 && hour < 23; // roughly 08:00–18:00 local in the U.S.
      const inFailure = failure && t >= failure && t < failure + failureLen;
      let v;
      switch (typeId) {
        case 1: v = 3 + Math.sin((t % (6 * HOUR)) / (6 * HOUR) * 2 * Math.PI) * 0.6 + ((t % (6 * HOUR)) < 25 * MINUTE ? 2.8 : 0) + r.normal(0, 0.35) + (inFailure ? (t - failure) / HOUR * 1.1 : 0); break;
        case 8: v = -19 + r.normal(0, 0.6) + ((t % (8 * HOUR)) < 30 * MINUTE ? 4 : 0) + (inFailure ? (t - failure) / HOUR * 1.4 : 0); break;
        case 2: v = (work ? 22.2 : 19.5) + Math.sin((hour - 9) / 24 * 2 * Math.PI) * 1.2 + r.normal(0, 0.4) + (inFailure ? 7 : 0); break;
        case 3: v = 45 + Math.sin(t / (3 * DAY)) * 9 + r.normal(0, 2.5) + (inFailure ? 28 : 0); break;
        case 4: v = work ? 650 + r.lognormal(320, 0.35) + (inFailure ? 900 : 0) : 430 + r.normal(0, 25); break;
        case 5: v = work ? 180 + r.normal(0, 22) + (inFailure ? 160 : 0) : dow === 0 || dow === 6 ? 35 + r.normal(0, 6) : 60 + r.normal(0, 10); break;
        case 6: v = 2.2 + r.normal(0, 0.35) + (failure && t < failure + failureLen ? Math.max(0, (t - (failure - 10 * DAY)) / DAY) * drift * 0.5 : 0); break;
        case 7: v = 420 + Math.sin(hour / 24 * 2 * Math.PI) * 35 + r.normal(0, 12) - (inFailure ? 230 : 0); break;
        case 9: v = Math.max(0, r.lognormal(9, 0.5) + (inFailure ? 45 : 0)); break;
        case 10: v = 3.9 - (t - START) / (60 * DAY) * 0.45 + r.normal(0, 0.02) - (inFailure ? 0.5 : 0); break;
        default: v = 0;
      }
      v = round2(v);
      if (r.chance(faultRate)) v = r.chance(0.6) ? null : r.pick([-999, vmax * 3, 0]);
      if (battery !== null) battery = Math.max(3, battery - (r.chance(0.04) ? 1 : 0));
      seq++;
      const received = outage?.buffered ? outage.e + r.int(1, 30) * MINUTE + Math.floor((t - outage.s) / 200) : t + r.int(2, 90) * 1000;
      pendingReadings.push([0, d.id, seq, ts(t), ts(received), v, battery, received]);
      if (r.chance(0.009)) pendingReadings.push([0, d.id, seq, ts(t), ts(received + r.int(5, 300) * 1000), v, battery, received + 1]); // retransmission
      // Threshold alerts with hysteresis.
      if (v !== null && v >= vmin && v <= vmax) {
        const open = alerts.findLast?.(a => a[1] === d.id && a[5] === null && (a[2] === 'high_threshold' || a[2] === 'low_threshold'));
        const breachHigh = high !== null && v > high, breachLow = low !== null && v < low;
        if (open) {
          const clearHigh = open[2] === 'high_threshold' && v <= high - Math.abs(high) * 0.05;
          const clearLow = open[2] === 'low_threshold' && v >= low + Math.abs(low) * 0.05;
          if (clearHigh || clearLow) open[5] = ts(t);
          else open[6] = open[2] === 'high_threshold' ? Math.max(open[6], v) : Math.min(open[6], v);
          if (!clearHigh && !clearLow && open[3] === 'warning' && (t - ms(open[4])) > 2 * HOUR) open[3] = 'critical';
        } else if (breachHigh || breachLow) alerts.push([0, d.id, breachHigh ? 'high_threshold' : 'low_threshold', 'warning', ts(t), null, v]);
      }
      lastValue = v;
    }
    void lastValue;
    // Status events: outages, failures, maintenance and retirement.
    for (const o of outages) {
      if (o.s >= stop) continue;
      setStatus(o.s, 'offline', o.buffered ? 'network loss' : 'power loss');
      alerts.push([0, d.id, 'offline', o.e - o.s > 6 * HOUR ? 'critical' : 'warning', ts(o.s + 2 * interval), o.e < END - HOUR ? ts(o.e) : null, null]);
      if (o.e < stop) setStatus(o.e, 'online', 'reconnected');
    }
    const orders = [];
    if (failure && failure < stop) {
      setStatus(failure + HOUR, 'degraded', 'reading outside normal range');
      const start = failure + failureLen - r.int(1, 3) * HOUR;
      const done = start + r.int(1, 4) * HOUR;
      orders.push({ type: [1, 8].includes(typeId) ? 'repair' : typeId === 6 ? 'repair' : r.pick(['repair', 'replacement']), start, done });
      if (r.chance(0.35)) orders.push({ type: 'repair', start: start + r.int(10, 50) * MINUTE, done: done + r.int(0, 90) * MINUTE }); // duplicate work order, overlapping
    }
    if (r.chance(0.35)) { const s = START + r.int(2, 58) * DAY + r.int(14, 21) * HOUR; orders.push({ type: 'calibration', start: s, done: s + r.int(20, 90) * MINUTE }); }
    if (d.battery && battery !== null && battery < 25 && r.chance(0.6)) { const s = END - r.int(2, 12) * DAY; orders.push({ type: 'battery_replacement', start: s, done: s + 30 * MINUTE }); alerts.push([0, d.id, 'low_battery', 'warning', ts(s - r.int(1, 6) * DAY), ts(s + 30 * MINUTE), null]); }
    if (r.chance(0.15)) { const s = START + r.int(20, 40) * DAY + 2 * HOUR; orders.push({ type: 'firmware_update', start: s, done: s + 15 * MINUTE }); }
    for (const o of orders) {
      const open = o.done >= END || r.chance(0.02);
      maintenance.push([0, d.id, o.type, r.pick(technicians), ts(o.start), open ? null : ts(o.done), round2(o.type === 'replacement' ? r.float(180, 450) : o.type === 'repair' ? r.float(90, 600) : o.type === 'calibration' ? r.float(40, 120) : r.float(10, 60))]);
      setStatus(o.start, 'maintenance', o.type);
      if (!open && o.done < stop) setStatus(o.done, 'online', 'maintenance completed');
    }
    if (retired) setStatus(retired, 'retired', 'removed from service');
    statusLog.sort((a, b) => a.t - b.t);
    let prev = null;
    for (const e of statusLog) { if (prev === e.s) continue; status.push([0, d.id, ts(e.t), e.s, e.reason]); prev = e.s; }
    devices[d.id - 1] = [d.id, `SN-${String(typeId).padStart(2, '0')}${String(d.id * 7919 % 100000).padStart(5, '0')}`, typeId, d.locationId, r.pick(MODELS[typeId]), firmware, INTERVAL[typeId], ts(d.installed), retired ? ts(retired) : null];
    void name;
  }
  pendingReadings.sort((a, b) => a[7] - b[7] || a[1] - b[1] || a[2] - b[2]);
  // Radio and quality attributes are derived per reading from stable hashes, so they never shift the readings above.
  const deviceType = new Map(devices.map(d => [d[0], d[2]])), locationOf = new Map(devices.map(d => [d[0], d[3]]));
  pendingReadings.forEach((p, i) => {
    const [, deviceId, seq, , , v, battery] = p;
    const [, , , vmin, vmax] = SENSOR_TYPES[deviceType.get(deviceId) - 1];
    const wireless = battery !== null;
    const h = hash32(`${deviceId}|${seq}`);
    const gateway = wireless ? locationOf.get(deviceId) * 10 + 1 + ((hash32(`gw${deviceId}`) + (h % 40 === 0 ? 1 : 0)) % 2) : null;
    const rssi = wireless ? -58 - (hash32(`rssi${deviceId}`) % 30) - (h % 9) : null;
    const quality = v === null ? 'fault' : v < vmin || v > vmax ? 'out_of_range' : 'ok';
    readings.push([i + 1, deviceId, seq, p[3], p[4], v, battery, gateway, rssi, quality]);
  });
  alerts.sort((a, b) => (a[4] < b[4] ? -1 : a[4] > b[4] ? 1 : a[1] - b[1]));
  alerts.forEach((a, i) => { a[0] = i + 1; });
  maintenance.sort((a, b) => (a[4] < b[4] ? -1 : a[4] > b[4] ? 1 : a[1] - b[1]));
  maintenance.forEach((m, i) => { m[0] = i + 1; });
  status.sort((a, b) => a[1] - b[1] || (a[2] < b[2] ? -1 : 1));
  status.forEach((s, i) => { s[0] = i + 1; });
  void readingSeq;
  return { locations, sensor_types: SENSOR_TYPES, devices, sensor_readings: readings, alerts, maintenance, device_status_events: status };
}

const dataset = {
  id: 'iot',
  version: '3.0.0',
  name: 'IoT / Sensors',
  domain: 'Industrial monitoring',
  kind: 'synthetic',
  description: 'Two months of telemetry from sensors across eight fictional facilities: cold rooms, freezers, production lines, offices and pump stations, with alerts, outages and maintenance.',
  source: {
    publisher: 'Runtime',
    url: 'https://github.com/KrishnaSathvik/runtime.school',
    release: `Runtime IoT generator ${GENERATOR_VERSION}, seed ${SEED}`,
    license: 'Runtime-owned synthetic data',
    licenseUrl: 'https://github.com/KrishnaSathvik/runtime.school',
    commercialReuse: 'permitted',
    attribution: 'Synthetic data generated by Runtime.',
    retrieved: '2026-10-14',
    transformations: [
      'Signals follow physical patterns: defrost cycles, occupancy-driven CO2, working-hours power, vibration drift before failures, battery discharge.',
      'Alerts are derived from the readings with hysteresis; status events and maintenance follow outages and failures.',
      'Network outages buffer readings and deliver them late; power outages lose them; about 1% of messages are retransmitted.',
    ],
  },
  reproduction: { command: 'node datasets/build.mjs iot', implementation: 'datasets/iot/dataset.mjs', seed: SEED, notes: `Generator version ${GENERATOR_VERSION}; deterministic for a given seed.` },
  coverage: { start: '2025-03-01', end: '2025-04-30', grain: 'sensor reading' },
  tables,
  edgeCases: [
    'Gaps in readings during outages and dropped messages',
    'Late batches delivered after a network outage (received_at ≫ recorded_at)',
    'Retransmitted duplicates with the same sequence_number',
    'Fault readings: NULL values and physically impossible values',
    'Threshold violations forming consecutive runs (islands)',
    'Overlapping maintenance work orders for the same device',
    'Devices installed or retired during the period; spares that never reported',
    'Status changes recorded only when the state changes (fill-forward needed)',
  ],
  qualityNotes: [
    'Order by recorded_at for physical analysis and by received_at for pipeline analysis.',
    'Deduplicate on (device_id, sequence_number) before counting readings.',
    'Exclude values outside the sensor type’s valid range before averaging.',
  ],
  concepts: ['LEAD/LAG', 'rolling averages', 'gaps and islands', 'consecutive events', 'fill-forward', 'interval merging', 'latest row per group', 'deduplication'],
  rows: () => generate(),
  mutation: `
DELETE FROM sensor_readings WHERE reading_id % 97 = 0;
UPDATE sensor_readings SET value = value + 2.5 WHERE device_id IN (SELECT device_id FROM devices WHERE sensor_type_id = 1) AND reading_id % 13 = 0;
INSERT INTO sensor_readings SELECT (SELECT MAX(reading_id) FROM sensor_readings) + reading_id, device_id, sequence_number, recorded_at, datetime(received_at, '+2 minutes'), value, battery_pct, gateway_id, signal_rssi_dbm, quality_flag FROM sensor_readings WHERE reading_id % 241 = 0;
UPDATE device_status_events SET status = 'degraded' WHERE status_event_id % 19 = 0 AND status = 'online';
INSERT INTO maintenance VALUES ((SELECT MAX(maintenance_id) + 1 FROM maintenance), 1, 'calibration', 'Test Technician', '2025-04-02 15:00:00', '2025-04-02 16:30:00', 75.0);
UPDATE alerts SET closed_at = NULL WHERE alert_id % 31 = 0;
`,
  contract: {
    totalRows: [120000, 180000],
    minRows: { locations: 40, sensor_types: 10, devices: 150, sensor_readings: 110000, alerts: 250, maintenance: 100, device_status_events: 500 },
    checks: [
      { name: 'days covered', sql: "SELECT COUNT(DISTINCT substr(recorded_at, 1, 10)) FROM sensor_readings", equals: 61 },
      { name: 'reporting devices', sql: distinct('sensor_readings', 'device_id'), min: 140 },
      { name: 'out-of-range readings flagged', sql: "SELECT COUNT(*) FROM sensor_readings WHERE quality_flag = 'out_of_range'", min: 50 },
      { name: 'fault flag matches missing value', sql: "SELECT COUNT(*) FROM sensor_readings WHERE (quality_flag = 'fault') <> (value IS NULL)", equals: 0 },
      { name: 'wired readings without radio data', sql: 'SELECT COUNT(*) FROM sensor_readings WHERE (battery_pct IS NULL) <> (signal_rssi_dbm IS NULL)', equals: 0 },
      { name: 'largest device share of readings', sql: maxShare('sensor_readings', 'device_id'), max: 0.06 },
      { name: 'retransmitted duplicates', sql: 'SELECT COUNT(*) FROM (SELECT 1 FROM sensor_readings GROUP BY device_id, sequence_number HAVING COUNT(*) > 1)', min: 500 },
      { name: 'late readings (> 1 hour)', sql: "SELECT COUNT(*) FROM sensor_readings WHERE julianday(received_at) - julianday(recorded_at) > 1.0 / 24", min: 500 },
      { name: 'NULL fault readings', sql: nulls('sensor_readings', 'value'), min: 50 },
      { name: 'impossible values', sql: 'SELECT COUNT(*) FROM sensor_readings r JOIN devices d USING (device_id) JOIN sensor_types t USING (sensor_type_id) WHERE r.value < t.valid_min OR r.value > t.valid_max', min: 30 },
      { name: 'gaps longer than 3 intervals', sql: 'SELECT COUNT(*) FROM (SELECT d.reporting_interval_minutes AS i, (julianday(r.recorded_at) - julianday(LAG(r.recorded_at) OVER (PARTITION BY r.device_id ORDER BY r.recorded_at))) * 1440 AS gap FROM sensor_readings r JOIN devices d USING (device_id)) WHERE gap > 3 * i', min: 60 },
      { name: 'threshold alerts', sql: "SELECT COUNT(*) FROM alerts WHERE alert_type IN ('high_threshold', 'low_threshold')", min: 100 },
      { name: 'alert types', sql: distinct('alerts', 'alert_type'), equals: 4 },
      { name: 'overlapping maintenance orders', sql: 'SELECT COUNT(*) FROM maintenance a JOIN maintenance b ON a.device_id = b.device_id AND a.maintenance_id < b.maintenance_id AND b.started_at < COALESCE(a.completed_at, \'9999\') AND a.started_at < COALESCE(b.completed_at, \'9999\')', min: 5 },
      { name: 'devices with no readings', sql: 'SELECT COUNT(*) FROM devices d WHERE NOT EXISTS (SELECT 1 FROM sensor_readings r WHERE r.device_id = d.device_id)', min: 5 },
      { name: 'status values', sql: distinct('device_status_events', 'status'), equals: 5 },
    ],
  },
};

export default dataset;
