/**
 * D03 CFPB Consumer Complaint Database: the first 600 complaints (by creation date) received on the 15th of each
 * month of 2024, recorded as the public search API returned them. U.S. government work, public domain.
 * The API no longer returns consumer narratives, so this extract has none. Run: node datasets/python/D03/acquire.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getJson, sleep, today, writeJsonGz, writeSource } from '../lib/acquire.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const API = 'https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/';
const days = Array.from({ length: 12 }, (_, i) => `2024-${String(i + 1).padStart(2, '0')}-15`);
const responses = [];
for (const d of days) {
  const url = `${API}?size=600&date_received_min=${d}&date_received_max=${d}&sort=created_date_asc&no_aggs=true`;
  const r = await getJson(url);
  responses.push({ day: d, total: r.hits.total.value, hits: r.hits.hits.map(h => h._source) });
  console.log(d, r.hits.hits.length, 'of', r.hits.total.value);
  await sleep(800);
}
writeJsonGz(path.join(dir, 'extract/responses.json.gz'), responses);
writeSource(dir, {
  publisher: 'Consumer Financial Protection Bureau',
  service: API,
  query: 'size=600&date_received_min=<day>&date_received_max=<day>&sort=created_date_asc&no_aggs=true for the 15th of each month of 2024',
  retrieved: today(),
  licence: 'U.S. government work, public domain (https://www.consumerfinance.gov/complaint/data-use/)',
  attribution: 'Source: Consumer Financial Protection Bureau, Consumer Complaint Database.',
  notes: 'Complaints are not verified by the CFPB. Counts reflect what consumers chose to submit, not company-wide rates. The API returned no narratives on the retrieval date.',
  complaints: responses.reduce((s, r) => s + r.hits.length, 0),
});
