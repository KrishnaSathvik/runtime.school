/**
 * D10 OpenAlex: scholarly works about Python and data science education, recorded exactly as the API returned
 * them (cursor pagination, 200 per page). OpenAlex data is CC0. Run: node datasets/python/D10/acquire.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getJson, sleep, today, writeJsonGz, writeSource } from '../lib/acquire.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const SELECT = 'id,doi,title,publication_year,publication_date,type,language,cited_by_count,is_retracted,open_access,primary_location,authorships,topics,keywords,referenced_works_count,biblio';
const FILTER = 'title_and_abstract.search:python,publication_year:2019-2024,type:article|book-chapter|preprint';
const base = `https://api.openalex.org/works?filter=${encodeURIComponent(FILTER)}&select=${SELECT}&sort=cited_by_count:desc&per-page=200&mailto=datasets@runtime.school`;
const pages = [];
// Page-number paging (OpenAlex allows it for the first 10,000 results without an API key).
for (let n = 1; n <= 6; n++) {
  const page = await getJson(`${base}&page=${n}`);
  // Response metadata that changes on every call (timing) is replaced by a stable stand-in.
  page.meta = { ...page.meta, db_response_time_ms: null };
  pages.push(page);
  console.log('page', n, page.results.length);
  await sleep(400);
}
writeJsonGz(path.join(dir, 'extract/pages.json.gz'), pages);
writeSource(dir, {
  publisher: 'OpenAlex (OurResearch)',
  service: 'https://api.openalex.org/works',
  query: `filter=${FILTER}; select=${SELECT}; sort=cited_by_count:desc; per-page=200; page-number pagination (page=1..6)`,
  retrieved: today(),
  licence: 'CC0 1.0 (https://openalex.org/about, https://creativecommons.org/publicdomain/zero/1.0/)',
  attribution: 'Data from OpenAlex (openalex.org), CC0.',
  changes: 'Recorded six API pages as returned. The per-call response time is replaced with null.',
  works: pages.reduce((s, p) => s + p.results.length, 0),
});
