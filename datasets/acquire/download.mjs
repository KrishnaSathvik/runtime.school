/**
 * Download pinned source files into a directory of your choice (never into the repository).
 *   node datasets/acquire/download.mjs <downloads-dir> [dataset ...]
 * Only data files are fetched; no upstream code is executed. Hash mismatches on fixed releases
 * fail; on living sources they warn, because the publisher refreshes those files in place.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { SOURCES, DATASET_SOURCES } from './sources.mjs';

const [dir, ...ids] = process.argv.slice(2);
if (!dir) throw new Error('Usage: node datasets/acquire/download.mjs <downloads-dir> [dataset ...]');
fs.mkdirSync(dir, { recursive: true });
const names = [...new Set((ids.length ? ids : Object.keys(DATASET_SOURCES)).flatMap(id => DATASET_SOURCES[id] ?? []))];
for (const name of names) {
  const { url, sha256, living } = SOURCES[name];
  const target = path.join(dir, name);
  if (!fs.existsSync(target)) {
    const response = await fetch(url, { headers: { 'user-agent': 'runtime-dataset-build' } });
    if (!response.ok) throw new Error(`${name}: HTTP ${response.status}`);
    fs.writeFileSync(target, Buffer.from(await response.arrayBuffer()));
  }
  const actual = createHash('sha256').update(fs.readFileSync(target)).digest('hex');
  if (actual !== sha256) {
    if (!living) throw new Error(`${name}: unexpected sha256 ${actual}; review the upstream release before importing`);
    console.warn(`${name}: upstream refreshed (sha256 ${actual}); review before re-extracting`);
  }
  console.log(`ok ${name}`);
}
// The NOAA weather extract is fetched per station by datasets/acquire/weather.mjs (NCEI access API).
