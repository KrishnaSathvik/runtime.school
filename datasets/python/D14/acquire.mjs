/**
 * D14 OpenStreetMap: points of interest in Portland, Oregon (OSM relation 186579), from the Overpass API: food and
 * drink, everyday services, transport, parks and selected shops. Ways and areas are reduced to their centre point.
 * Open Database License (ODbL). Run: node datasets/python/D14/acquire.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getJson, today, writeJsonGz, writeSource } from '../lib/acquire.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const AMENITY = 'cafe|restaurant|bar|pub|fast_food|ice_cream|library|school|pharmacy|hospital|clinic|dentist|bank|post_office|fuel|charging_station|bicycle_rental|drinking_water|toilets|theatre|cinema|community_centre';
const SHOP = 'supermarket|bakery|books|bicycle|convenience|greengrocer|hardware';
const LEISURE = 'park|playground|sports_centre|dog_park';
const query = `[out:json][timeout:120];
area(id:3600186579)->.city;
(
  nwr["amenity"~"^(${AMENITY})$"](area.city);
  nwr["shop"~"^(${SHOP})$"](area.city);
  nwr["leisure"~"^(${LEISURE})$"](area.city);
);
out center tags;`;
const r = await getJson('https://overpass-api.de/api/interpreter', { method: 'POST', body: new URLSearchParams({ data: query }), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
const elements = r.elements
  .map(e => ({ type: e.type, id: e.id, lat: e.lat ?? e.center?.lat ?? null, lon: e.lon ?? e.center?.lon ?? null, tags: Object.fromEntries(Object.entries(e.tags ?? {}).sort(([a], [b]) => a.localeCompare(b))) }))
  .sort((a, b) => a.type.localeCompare(b.type) || a.id - b.id);
writeJsonGz(path.join(dir, 'extract/elements.json.gz'), { osm3s: { timestamp_osm_base: r.osm3s?.timestamp_osm_base ?? null, copyright: r.osm3s?.copyright ?? null }, elements });
writeSource(dir, {
  publisher: 'OpenStreetMap contributors',
  service: 'https://overpass-api.de/api/interpreter',
  query,
  retrieved: today(),
  osm_base: r.osm3s?.timestamp_osm_base ?? null,
  licence: 'Open Database License (ODbL) 1.0 (https://www.openstreetmap.org/copyright). This extract is offered under the ODbL.',
  attribution: '© OpenStreetMap contributors, available under the Open Database License.',
  changes: 'Ways and relations reduced to their centre point (Overpass "out center"). Tags sorted by key. Values are unchanged.',
  elements: elements.length,
});
console.log('D14 elements', elements.length);
