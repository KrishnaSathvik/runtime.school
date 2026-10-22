/**
 * D10 OpenAlex: the 1,200 most-cited works from 2019–2024 that mention Python in their title or abstract, recorded
 * from the OpenAlex API (acquire.mjs → extract/pages.json.gz; source.json). CC0.
 *
 * Each edition has flat tables (works, authorships, keywords), the works as JSON Lines (one nested API record per
 * line), and the recorded API pages themselves for pagination practice. Only the per-call notice, cost and query
 * echo are dropped from page metadata, and the bulkiest repeated sub-fields from each record (see slim()).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonGz } from '../lib/acquire.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const col = (name, type, description, nullable = false) => ({ name, type, description, nullable });
const short = id => (id ? id.replace('https://openalex.org/', '') : null);

/**
 * The nested records keep their API shape but drop the bulkiest repeated sub-fields (raw affiliation strings,
 * institution lineages, source ranking lists, ORCID history), which made one page several megabytes.
 */
function slim(w) {
  const r = structuredClone(w);
  for (const a of r.authorships ?? []) {
    delete a.raw_affiliation_strings; delete a.affiliations; delete a.raw_orcid;
    if (a.author) delete a.author.observed_orcids;
    for (const i of a.institutions ?? []) delete i.lineage;
  }
  const src = r.primary_location?.source;
  if (src) { delete src.listed_in; delete src.host_organization_lineage; delete src.host_organization_lineage_names; }
  for (const t of r.topics ?? []) { delete t.subfield; delete t.domain; }
  return r;
}

function generate() {
  const pages = readJsonGz(path.join(dir, 'extract/pages.json.gz')).map(p => ({ meta: { count: p.meta.count, db_response_time_ms: null, page: p.meta.page, per_page: p.meta.per_page, groups_count: p.meta.groups_count }, results: p.results.map(slim) }));
  const records = pages.flatMap(p => p.results);
  const works = [], authorships = [], keywords = [];
  for (const w of records) {
    const id = short(w.id);
    const loc = w.primary_location ?? {};
    works.push({
      work_id: id, doi: w.doi, title: w.title, publication_year: w.publication_year, publication_date: w.publication_date, type: w.type,
      language: w.language, cited_by_count: w.cited_by_count, is_retracted: w.is_retracted ? 1 : 0, is_oa: w.open_access?.is_oa ? 1 : 0,
      oa_status: w.open_access?.oa_status ?? null, source_name: loc.source?.display_name ?? null, source_type: loc.source?.type ?? null,
      publisher: loc.source?.host_organization_name ?? null, licence: loc.license ?? null, topic: w.topics?.[0]?.display_name ?? null,
      field: w.topics?.[0]?.field?.display_name ?? null, referenced_works_count: w.referenced_works_count,
      volume: w.biblio?.volume ?? null, issue: w.biblio?.issue ?? null, first_page: w.biblio?.first_page ?? null, last_page: w.biblio?.last_page ?? null,
    });
    (w.authorships ?? []).forEach((a, i) => authorships.push({
      work_id: id, author_order: i + 1, author_position: a.author_position, author_id: short(a.author?.id), author_name: a.author?.display_name ?? a.raw_author_name ?? null,
      institutions: (a.institutions ?? []).map(x => x.display_name).join('; ') || null, countries: (a.countries ?? []).join(';') || null, is_corresponding: a.is_corresponding ? 1 : 0,
    }));
    for (const k of w.keywords ?? []) keywords.push({ work_id: id, keyword: k.display_name, score: k.score });
  }
  return { works, authorships, keywords, pages, records };
}

const EDITIONS = { preview: { works: 25 }, starter: { works: 200 }, standard: { works: Infinity } };

function cutEdition(full, edition) {
  const n = EDITIONS[edition].works;
  const works = full.works.slice(0, n);
  const ids = new Set(works.map(w => w.work_id));
  return { works, authorships: full.authorships.filter(a => ids.has(a.work_id)), keywords: full.keywords.filter(k => ids.has(k.work_id)) };
}

function extraFiles(tables, edition, full) {
  const n = tables.works.length;
  const out = [{ path: 'works.jsonl', table: 'works', text: full.records.slice(0, n).map(r => JSON.stringify(r)).join('\n') + '\n', rows: n }];
  // Recorded pages: as many 200-work pages as the edition holds (the preview is one short page).
  full.pages.forEach((p, i) => {
    if (i * 200 >= n) return;
    const results = p.results.slice(0, Math.min(200, n - i * 200));
    out.push({ path: `api/works-page-${i + 1}.json`, table: 'works', text: JSON.stringify({ meta: { ...p.meta, per_page: results.length < 200 ? results.length : 200 }, results, group_by: [] }) + '\n', rows: results.length });
  });
  return out;
}

function realIssues({ works, authorships }) {
  return [
    { id: 'no_doi', description: 'Works with no DOI', count: works.filter(w => !w.doi).length },
    { id: 'no_source', description: 'Works with no known journal or repository', count: works.filter(w => !w.source_name).length },
    { id: 'no_pages', description: 'Works with no page numbers', count: works.filter(w => !w.first_page).length },
    { id: 'no_institution', description: 'Authorships with no institution', count: authorships.filter(a => !a.institutions).length },
    { id: 'many_authors', description: 'Works with more than 20 authors', count: works.filter(w => authorships.filter(a => a.work_id === w.work_id).length > 20).length },
  ];
}

const dataset = {
  id: 'D10',
  title: 'OpenAlex Research Papers',
  version: 1,
  seed: null,
  description:
    'The 1,200 most-cited research works from 2019–2024 that mention Python, from OpenAlex: titles, venues, citations, ' +
    'open-access status, authors and institutions. Comes as flat tables, as nested JSON Lines and as the API’s own pages.',
  licence: { name: 'CC0 1.0', status: 'cleared' },
  attribution: 'Data from OpenAlex (openalex.org), CC0.',
  source: 'OpenAlex API /works, filter title_and_abstract.search:python, 2019–2024, sorted by citations (datasets/python/D10/source.json)',
  generator: 'datasets/python/D10/dataset.mjs from datasets/python/D10/extract',
  window: ['2019-01-01', '2024-12-31'],
  tables: {
    works: {
      description: 'One research work (article, chapter or preprint).',
      primaryKey: ['work_id'],
      columns: [
        col('work_id', 'text', 'OpenAlex work ID'), col('doi', 'text', 'DOI link', true), col('title', 'text', 'Title', true),
        col('publication_year', 'integer', 'Year published'), col('publication_date', 'date', 'Date published'), col('type', 'text', 'article, book-chapter or preprint'),
        col('language', 'text', 'Language code', true), col('cited_by_count', 'integer', 'Times cited (when collected)'), col('is_retracted', 'integer', '1 if retracted'),
        col('is_oa', 'integer', '1 if free to read'), col('oa_status', 'text', 'How it is free to read: gold, green, hybrid, bronze, diamond, or closed (not free)', true),
        col('source_name', 'text', 'Journal, conference or repository', true), col('source_type', 'text', 'journal, repository, conference, …', true),
        col('publisher', 'text', 'Publisher', true), col('licence', 'text', 'Licence of the primary version', true),
        col('topic', 'text', 'Main research topic', true), col('field', 'text', 'Field of the main topic', true),
        col('referenced_works_count', 'integer', 'Number of works it cites'), col('volume', 'text', 'Volume', true), col('issue', 'text', 'Issue', true),
        col('first_page', 'text', 'First page', true), col('last_page', 'text', 'Last page', true),
      ],
    },
    authorships: {
      description: 'One author of one work, in the order the paper lists them.',
      primaryKey: ['work_id', 'author_order'],
      foreignKeys: [{ column: 'work_id', references: 'works.work_id' }],
      columns: [
        col('work_id', 'text', 'Work'), col('author_order', 'integer', 'Position in the author list (1 = first)'), col('author_position', 'text', 'first, middle or last'),
        col('author_id', 'text', 'OpenAlex author ID', true), col('author_name', 'text', 'Name as OpenAlex shows it', true),
        col('institutions', 'text', 'Institutions, separated by "; "', true), col('countries', 'text', 'Country codes, separated by ";"', true),
        col('is_corresponding', 'integer', '1 for the author who handles contact about the paper'),
      ],
    },
    keywords: {
      description: 'One keyword OpenAlex assigned to a work, with its score.',
      primaryKey: ['work_id', 'keyword'],
      foreignKeys: [{ column: 'work_id', references: 'works.work_id' }],
      columns: [col('work_id', 'text', 'Work'), col('keyword', 'text', 'Keyword'), col('score', 'decimal', 'Relevance, 0–1')],
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
