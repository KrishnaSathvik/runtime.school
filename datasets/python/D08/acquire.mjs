/**
 * D08 USGS earthquakes: every M2.5+ event worldwide, 2025-01-01 to 2025-06-30, from the USGS FDSN event web service
 * (GeoJSON), fetched month by month. U.S. government work, public domain. Run: node datasets/python/D08/acquire.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getJson, sleep, today, writeJsonGz, writeSource } from '../lib/acquire.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const months = ['2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07'];
const features = [];
for (let i = 0; i < months.length - 1; i++) {
  const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${months[i]}-01&endtime=${months[i + 1]}-01&minmagnitude=2.5&orderby=time-asc`;
  const fc = await getJson(url);
  // "detail" is a per-event API link that changes with every refresh of the feed; everything else is the event.
  for (const f of fc.features) delete f.properties.detail;
  features.push(...fc.features);
  console.log(months[i], fc.features.length);
  await sleep(1000);
}
features.sort((a, b) => a.properties.time - b.properties.time || a.id.localeCompare(b.id));
writeJsonGz(path.join(dir, 'extract/events.json.gz'), features);
writeSource(dir, {
  publisher: 'U.S. Geological Survey, Earthquake Hazards Program',
  service: 'https://earthquake.usgs.gov/fdsnws/event/1/',
  query: 'format=geojson&minmagnitude=2.5&orderby=time-asc, one request per calendar month, 2025-01-01 to 2025-07-01 (end exclusive)',
  retrieved: today(),
  licence: 'U.S. government work, public domain (https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits)',
  attribution: 'Earthquake data: U.S. Geological Survey, ANSS Comprehensive Earthquake Catalog.',
  changes: 'Removed the per-event "detail" API link. Nothing else changed. Magnitudes and locations are as published on the retrieval date; USGS revises events over time.',
  events: features.length,
});
console.log('D08 events', features.length);
