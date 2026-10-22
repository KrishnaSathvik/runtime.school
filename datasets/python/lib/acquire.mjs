/**
 * Shared helpers for acquiring the Python course's real-source datasets (datasets/python/<id>/acquire.mjs).
 *
 * Acquisition is the only step that touches the network. Each script records what it fetched as a committed,
 * gzipped JSON extract (datasets/python/<id>/extract/*.json.gz) plus source.json (where, when, licence, query),
 * and the build (datasets/python/build.mjs) reads only those extracts. So builds are offline and deterministic,
 * and a refreshed upstream never silently changes a published edition.
 */
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';

const UA = 'runtime.school dataset build (education; contact: datasets@runtime.school)';
const sleep = msec => new Promise(r => setTimeout(r, msec));

/** GET JSON with retries and backoff. */
export async function getJson(url, { tries = 5, headers = {}, method = 'GET', body } = {}) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url, { method, body, headers: { 'User-Agent': UA, Accept: 'application/json', ...headers } });
      if (res.status === 429 || res.status >= 500) throw new Error(`HTTP ${res.status}`);
      if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} for ${url}`), { fatal: true });
      return await res.json();
    } catch (err) {
      if (err.fatal || i >= tries) throw err;
      await sleep(1500 * 2 ** i);
    }
  }
}

export async function getText(url, opts = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, ...(opts.headers ?? {}) } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

export { sleep };

/** Deterministic gzip of JSON (Node's gzip header has no mtime), one value per file. */
export function writeJsonGz(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, gzipSync(JSON.stringify(value) + '\n', { level: 9 }));
}

export function readJsonGz(file) {
  return JSON.parse(gunzipSync(fs.readFileSync(file)).toString('utf8'));
}

/** Provenance written next to the extract. `retrieved` is the acquisition date, not the build date. */
export function writeSource(dir, source) {
  fs.writeFileSync(path.join(dir, 'source.json'), JSON.stringify(source, null, 2) + '\n');
}

export const today = () => new Date().toISOString().slice(0, 10);
