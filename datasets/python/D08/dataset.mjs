/**
 * D08 USGS earthquakes: every M2.5+ event worldwide, January–June 2025, recorded from the USGS FDSN event service
 * (datasets/python/D08/acquire.mjs → extract/events.json.gz, provenance in source.json). Public domain.
 *
 * Each edition has the flat events table (CSV), the events as the GeoJSON FeatureCollection the service returns
 * (nested: properties, geometry.coordinates = [lon, lat, depth]), and the same events split into the paged responses
 * the service gives with limit/offset, for pagination practice. Values are as published; nothing is injected.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonGz } from '../lib/acquire.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const col = (name, type, description, nullable = false) => ({ name, type, description, nullable });
const PAGE = 200;
const iso = msec => new Date(msec).toISOString().replace('T', ' ').slice(0, 19);

function generate() {
  const features = readJsonGz(path.join(dir, 'extract/events.json.gz'));
  const events = features.map(f => {
    const p = f.properties;
    const [lon, lat, depth] = f.geometry.coordinates;
    return {
      event_id: f.id, time_ms: p.time, time_utc: iso(p.time), updated_utc: iso(p.updated), magnitude: p.mag, mag_type: p.magType,
      place: p.place, latitude: lat, longitude: lon, depth_km: depth, event_type: p.type, status: p.status, tsunami: p.tsunami,
      significance: p.sig, felt_reports: p.felt, cdi: p.cdi, mmi: p.mmi, alert: p.alert, network: p.net, stations: p.nst,
      min_distance_deg: p.dmin, rms: p.rms, gap_deg: p.gap, title: p.title, url: p.url,
    };
  });
  return { events, features };
}

const EDITIONS = {
  preview: { from: '2025-03-01', to: '2025-03-01 23:59:59', limit: 20 },
  starter: { from: '2025-03-01', to: '2025-03-07 23:59:59' },
  standard: { from: '2025-03-01', to: '2025-03-31 23:59:59' },
  full: { from: '0000', to: '9999' },
};

function cutEdition(full, edition) {
  const e = EDITIONS[edition];
  let events = full.events.filter(x => x.time_utc >= e.from && x.time_utc <= e.to);
  if (e.limit) events = events.slice(0, e.limit);
  return { events };
}

function extraFiles(tables, edition, full) {
  const ids = new Set(tables.events.map(e => e.event_id));
  const features = full.features.filter(f => ids.has(f.id));
  const meta = (extra) => ({ generated: Date.parse('2025-07-01T00:00:00Z'), title: 'USGS Earthquakes', status: 200, api: '2.8.1', count: features.length, ...extra });
  const out = [{ path: 'earthquakes.geojson', table: 'events', text: JSON.stringify({ type: 'FeatureCollection', metadata: meta({}), features }) + '\n', rows: features.length }];
  // The same events as limit/offset pages (offset is 1-based in the FDSN service). The full edition is for
  // volume work, so it skips the pages.
  for (let i = 0, n = 1; edition !== 'full' && i < features.length; i += PAGE, n++) {
    const slice = features.slice(i, i + PAGE);
    out.push({ path: `api/page-${String(n).padStart(3, '0')}.json`, table: 'events', text: JSON.stringify({ type: 'FeatureCollection', metadata: meta({ limit: PAGE, offset: i + 1, count: slice.length, total: features.length }), features: slice }) + '\n', rows: slice.length });
  }
  return out;
}

function realIssues({ events }) {
  return [
    { id: 'not_earthquakes', description: 'Events that are not earthquakes (mining explosions, explosions, other)', count: events.filter(e => e.event_type !== 'earthquake').length },
    { id: 'mixed_mag_types', description: 'Different magnitude scales in one column (mb, ml, md, mww, …): not directly comparable', count: new Set(events.map(e => e.mag_type)).size },
    { id: 'no_felt_reports', description: 'Events with no “Did You Feel It?” reports (felt_reports empty)', count: events.filter(e => e.felt_reports === null).length },
    { id: 'no_station_count', description: 'Events with no station count', count: events.filter(e => e.stations === null).length },
    { id: 'automatic', description: 'Events not yet reviewed by a seismologist (status automatic)', count: events.filter(e => e.status === 'automatic').length },
  ];
}

const dataset = {
  id: 'D08',
  title: 'USGS Earthquakes',
  version: 1,
  seed: null,
  description:
    'Every magnitude 2.5+ earthquake (and a few explosions) recorded worldwide by the USGS, January–June 2025: time, ' +
    'location, depth, magnitude, felt reports and alerts. Comes as a flat table, as the nested GeoJSON the USGS API ' +
    'returns, and as paged API responses.',
  licence: { name: 'U.S. government work (public domain)', status: 'cleared' },
  attribution: 'Earthquake data: U.S. Geological Survey, ANSS Comprehensive Earthquake Catalog.',
  source: 'USGS FDSN event web service, format=geojson&minmagnitude=2.5, 2025-01-01..2025-07-01 (datasets/python/D08/source.json)',
  generator: 'datasets/python/D08/dataset.mjs from datasets/python/D08/extract',
  window: ['2025-01-01', '2025-06-30'],
  tables: {
    events: {
      description: 'One earthquake (or other ground-shaking event, such as a mine blast).',
      primaryKey: ['event_id'],
      columns: [
        col('event_id', 'text', 'USGS event ID'), col('time_ms', 'integer', 'When it happened, as milliseconds since 1 January 1970 (UTC)'),
        col('time_utc', 'timestamp', 'When it happened, UTC'), col('updated_utc', 'timestamp', 'When USGS last updated the event, UTC'),
        col('magnitude', 'decimal', 'Magnitude'), col('mag_type', 'text', 'Magnitude scale (mb, ml, md, mww, …)'),
        col('place', 'text', 'Description of the location', true), col('latitude', 'decimal', 'Latitude, degrees'), col('longitude', 'decimal', 'Longitude, degrees'),
        col('depth_km', 'decimal', 'Depth, km below the surface'), col('event_type', 'text', 'earthquake, mining explosion, explosion, …'),
        col('status', 'text', 'reviewed or automatic'), col('tsunami', 'integer', '1 when a tsunami message was issued for an oceanic event'),
        col('significance', 'integer', 'How significant USGS rates it (0–1000+)'), col('felt_reports', 'integer', 'Number of “Did You Feel It?” reports', true),
        col('cdi', 'decimal', 'Strongest shaking people reported (1–10)', true), col('mmi', 'decimal', 'Strongest shaking measured by instruments (1–10)', true),
        col('alert', 'text', 'Impact alert: green, yellow, orange or red', true), col('network', 'text', 'Seismic network that reported it'),
        col('stations', 'integer', 'Number of seismic stations used', true), col('min_distance_deg', 'decimal', 'Distance to the nearest station, degrees', true),
        col('rms', 'decimal', 'How well the location fits the measurements, seconds (smaller is better)', true), col('gap_deg', 'decimal', 'Largest gap in station coverage around the quake, degrees', true),
        col('title', 'text', 'Title as shown by USGS'), col('url', 'text', 'USGS event page'),
      ],
    },
  },
  editions: Object.fromEntries(Object.keys(EDITIONS).map(k => [k, k])),
  parquet: { tables: ['events'], editions: ['full'] },
  stress: false,
  generate,
  cutEdition,
  extraFiles,
  realIssues,
};

export default dataset;
