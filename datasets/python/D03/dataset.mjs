/**
 * D03 CFPB Consumer Complaint Database: 7,200 real complaints, the first 600 received on the 15th of each month of
 * 2024, recorded from the CFPB's public search API (acquire.mjs → extract/responses.json.gz; source.json).
 * U.S. government work, public domain. The API returned no consumer narratives, so there are none here.
 *
 * Each edition has the flat complaints table, the complaints as JSON Lines, and the recorded API responses for the
 * days it covers (Elasticsearch-style: hits.total, hits.hits[]._source).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonGz } from '../lib/acquire.mjs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const col = (name, type, description, nullable = true) => ({ name, type, description, nullable });
const FIELDS = ['complaint_id', 'date_received', 'product', 'sub_product', 'issue', 'sub_issue', 'company', 'state', 'zip_code', 'tags', 'submitted_via', 'date_sent_to_company', 'company_response', 'company_public_response', 'timely'];

function generate() {
  const responses = readJsonGz(path.join(dir, 'extract/responses.json.gz'));
  const complaints = responses.flatMap(r => r.hits.map(h => ({ ...Object.fromEntries(FIELDS.map(f => [f, h[f] ?? null])), complaint_id: Number(h.complaint_id) })));
  return { complaints, responses };
}

const EDITIONS = { preview: { days: 1, limit: 25 }, starter: { days: 1 }, standard: { days: 12 } };

function cutEdition(full, edition) {
  const e = EDITIONS[edition];
  const days = new Set(full.responses.slice(0, e.days).map(r => r.day));
  let complaints = full.complaints.filter(c => days.has(c.date_received.slice(0, 10)));
  if (e.limit) complaints = complaints.slice(0, e.limit);
  return { complaints };
}

function extraFiles(tables, edition, full) {
  const ids = new Set(tables.complaints.map(c => String(c.complaint_id)));
  const out = [{ path: 'complaints.jsonl', table: 'complaints', text: tables.complaints.map(c => JSON.stringify({ ...c, complaint_id: String(c.complaint_id) })).join('\n') + '\n', rows: tables.complaints.length }];
  for (const r of full.responses) {
    const hits = r.hits.filter(h => ids.has(h.complaint_id));
    if (!hits.length) continue;
    const body = { took: null, timed_out: false, hits: { total: { value: r.total, relation: 'eq' }, max_score: null, hits: hits.map(h => ({ _index: 'complaint-public-v1', _id: h.complaint_id, _score: null, _source: h })) } };
    out.push({ path: `api/complaints-${r.day}.json`, table: 'complaints', text: JSON.stringify(body) + '\n', rows: hits.length });
  }
  return out;
}

function realIssues({ complaints: c }) {
  return [
    { id: 'masked_zip', description: 'ZIP codes partly masked for privacy (e.g. "891XX")', count: c.filter(x => x.zip_code && /X/.test(x.zip_code)).length },
    { id: 'missing_state', description: 'Complaints with no state', count: c.filter(x => !x.state).length },
    { id: 'missing_sub_issue', description: 'Complaints with no sub-issue', count: c.filter(x => !x.sub_issue).length },
    { id: 'multi_tags', description: 'Several tags in one text field ("Older American, Servicemember")', count: c.filter(x => x.tags?.includes(',')).length },
    { id: 'untimely', description: 'Company did not respond in time (timely = "No")', count: c.filter(x => x.timely === 'No').length },
    { id: 'iso_dates', description: 'Dates as ISO 8601 text with a Z (UTC) suffix and milliseconds', count: c.length },
  ];
}

const dataset = {
  id: 'D03',
  title: 'CFPB Consumer Complaints',
  version: 1,
  seed: null,
  description:
    'Real complaints people sent the U.S. Consumer Financial Protection Bureau in 2024 about credit reports, debt ' +
    'collection, cards, bank accounts and loans: the product, issue, company, state and how the company responded.',
  licence: { name: 'U.S. government work (public domain)', status: 'cleared' },
  attribution: 'Source: Consumer Financial Protection Bureau, Consumer Complaint Database. Complaints are not verified by the CFPB.',
  source: 'CFPB Consumer Complaint Database search API, first 600 complaints received on the 15th of each month of 2024 (datasets/python/D03/source.json)',
  generator: 'datasets/python/D03/dataset.mjs from datasets/python/D03/extract',
  window: ['2024-01-15', '2024-12-15'],
  tables: {
    complaints: {
      description: 'One complaint, as the CFPB published it. Most are about credit reports, as in the full database.',
      primaryKey: ['complaint_id'],
      columns: [
        col('complaint_id', 'integer', 'CFPB complaint ID', false), col('date_received', 'timestamp', 'When the CFPB received it (date and time as text, UTC)', false),
        col('product', 'text', 'Financial product', false), col('sub_product', 'text', 'More specific product'),
        col('issue', 'text', 'What went wrong', false), col('sub_issue', 'text', 'More specific issue'),
        col('company', 'text', 'Company the complaint is about', false), col('state', 'text', 'Consumer’s state'),
        col('zip_code', 'text', 'Consumer’s ZIP code; partly masked for small areas'), col('tags', 'text', 'Older American and/or Servicemember'),
        col('submitted_via', 'text', 'Web, Phone, Referral, …', false), col('date_sent_to_company', 'timestamp', 'When the CFPB sent it to the company (date and time as text, UTC)', false),
        col('company_response', 'text', 'How the company closed it', false), col('company_public_response', 'text', 'Company’s optional public statement'),
        col('timely', 'text', 'Yes if the company responded within 15 days', false),
      ],
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
