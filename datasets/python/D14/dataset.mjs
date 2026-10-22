/**
 * D14 OpenStreetMap: places in Portland, Oregon (food and drink, services, transport, parks and selected shops),
 * recorded from the Overpass API (acquire.mjs → extract/elements.json.gz; source.json). ODbL: the edition files are
 * offered under the ODbL and credit "© OpenStreetMap contributors".
 *
 * Each edition has a flat places table with the common tags as columns, a long tags table (every key/value), the
 * places as GeoJSON, and the Overpass JSON response itself (nested free-form tags).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonGz } from '../lib/acquire.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const col = (name, type, description, nullable = true) => ({ name, type, description, nullable });
const CENTRE = [45.5189, -122.6793]; // Pioneer Courthouse Square
const TAGS = ['name', 'cuisine', 'opening_hours', 'website', 'phone', 'wheelchair', 'outdoor_seating', 'brand', 'operator', 'addr:housenumber', 'addr:street', 'addr:postcode', 'addr:city'];

/** Great-circle distance in km. */
function km(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

function generate() {
  const { osm3s, elements } = readJsonGz(path.join(dir, 'extract/elements.json.gz'));
  const places = elements.map(e => {
    const t = e.tags;
    const category = t.amenity ? 'amenity' : t.shop ? 'shop' : 'leisure';
    const row = { osm_type: e.type, osm_id: e.id, category, kind: t[category], latitude: e.lat, longitude: e.lon };
    for (const k of TAGS) row[k.replace('addr:', 'addr_')] = t[k] ?? null;
    row.tag_count = Object.keys(t).length;
    return row;
  });
  const tags = elements.flatMap(e => Object.entries(e.tags).map(([key, value]) => ({ osm_type: e.type, osm_id: e.id, key, value })));
  return { places, tags, elements, osm3s };
}

const EDITIONS = { preview: { limit: 25, radius: 1 }, starter: { radius: 1.5 }, standard: { radius: Infinity } };

function cutEdition(full, edition) {
  const e = EDITIONS[edition];
  let places = full.places.filter(p => e.radius === Infinity || km(CENTRE[0], CENTRE[1], p.latitude, p.longitude) <= e.radius);
  if (e.limit) places = places.slice(0, e.limit);
  const keep = new Set(places.map(p => `${p.osm_type}/${p.osm_id}`));
  return { places, tags: full.tags.filter(t => keep.has(`${t.osm_type}/${t.osm_id}`)) };
}

function extraFiles(tables, edition, full) {
  const keep = new Set(tables.places.map(p => `${p.osm_type}/${p.osm_id}`));
  const elements = full.elements.filter(e => keep.has(`${e.type}/${e.id}`));
  const geo = {
    type: 'FeatureCollection',
    features: elements.map(e => ({ type: 'Feature', id: `${e.type}/${e.id}`, geometry: { type: 'Point', coordinates: [e.lon, e.lat] }, properties: e.tags })),
  };
  // Overpass "out center" gives ways and relations a centre object instead of lat/lon.
  const overpass = {
    version: 0.6, generator: 'Overpass API', osm3s: full.osm3s,
    elements: elements.map(e => (e.type === 'node' ? { type: e.type, id: e.id, lat: e.lat, lon: e.lon, tags: e.tags } : { type: e.type, id: e.id, center: { lat: e.lat, lon: e.lon }, tags: e.tags })),
  };
  return [
    { path: 'places.geojson', table: 'places', text: JSON.stringify(geo) + '\n', rows: elements.length },
    { path: 'overpass.json', table: 'places', text: JSON.stringify(overpass) + '\n', rows: elements.length },
  ];
}

function realIssues({ places }) {
  return [
    { id: 'no_name', description: 'Places with no name tag', count: places.filter(p => !p.name).length },
    { id: 'no_hours', description: 'Places with no opening_hours', count: places.filter(p => !p.opening_hours).length },
    { id: 'free_text_hours', description: 'Opening hours in OSM’s own syntax (e.g. "Mo-Fr 07:00-18:00; Sa 08:00-14:00"), not timestamps', count: places.filter(p => p.opening_hours).length },
    { id: 'mixed_city', description: 'Places whose addr_city is missing or not exactly "Portland"', count: places.filter(p => p.addr_city !== 'Portland').length },
    { id: 'multi_cuisine', description: 'Places listing several cuisines separated by ";"', count: places.filter(p => p.cuisine?.includes(';')).length },
  ];
}

const dataset = {
  id: 'D14',
  title: 'OpenStreetMap Portland Places',
  version: 1,
  seed: null,
  description:
    'Cafés, restaurants, libraries, schools, clinics, parks, bike rentals, charging stations and shops in Portland, ' +
    'Oregon, mapped by OpenStreetMap volunteers: names, coordinates, opening hours and free-form tags.',
  licence: { name: 'Open Database License (ODbL) 1.0', status: 'cleared' },
  attribution: '© OpenStreetMap contributors, available under the Open Database License (openstreetmap.org/copyright).',
  source: 'Overpass API query over OSM relation 186579 (Portland, Oregon) (datasets/python/D14/source.json)',
  generator: 'datasets/python/D14/dataset.mjs from datasets/python/D14/extract',
  window: ['2026-10-18', '2026-10-18'],
  tables: {
    places: {
      description: 'One mapped place. Buildings and areas are reduced to their centre point.',
      primaryKey: ['osm_type', 'osm_id'],
      columns: [
        col('osm_type', 'text', 'How OpenStreetMap stores it: node (a point), way (an outline) or relation (a group)', false), col('osm_id', 'integer', 'OpenStreetMap ID within its type', false),
        col('category', 'text', 'amenity, shop or leisure', false), col('kind', 'text', 'The value of that tag: cafe, library, park, …', false),
        col('latitude', 'decimal', 'Latitude', false), col('longitude', 'decimal', 'Longitude', false),
        col('name', 'text', 'Name'), col('cuisine', 'text', 'Cuisine(s), ";"-separated'), col('opening_hours', 'text', 'Opening hours in OpenStreetMap’s format, e.g. Mo-Fr 08:00-17:00'),
        col('website', 'text', 'Website'), col('phone', 'text', 'Phone number (business)'), col('wheelchair', 'text', 'yes, limited, no'),
        col('outdoor_seating', 'text', 'yes or no'), col('brand', 'text', 'Chain or brand'), col('operator', 'text', 'Who runs it'),
        col('addr_housenumber', 'text', 'House number'), col('addr_street', 'text', 'Street'), col('addr_postcode', 'text', 'ZIP code'), col('addr_city', 'text', 'City'),
        col('tag_count', 'integer', 'How many tags the place has', false),
      ],
    },
    tags: {
      description: 'One tag (key = value) on one place: every place’s tags, one per row.',
      primaryKey: ['osm_type', 'osm_id', 'key'],
      columns: [col('osm_type', 'text', 'How OpenStreetMap stores it: node (a point), way (an outline) or relation (a group)', false), col('osm_id', 'integer', 'Place ID', false), col('key', 'text', 'Tag key', false), col('value', 'text', 'Tag value', false)],
    },
  },
  editions: Object.fromEntries(Object.keys(EDITIONS).map(k => [k, k])),
  stress: false,
  generate,
  cutEdition,
  extraFiles,
  realIssues,
};

export default dataset;
