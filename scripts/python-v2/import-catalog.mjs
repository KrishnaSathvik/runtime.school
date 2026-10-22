/**
 * Build the canonical Python registry from the master pack's planning catalogue.
 *
 *   node scripts/python-v2/import-catalog.mjs <pack>/catalog
 *
 * Writes src/content/python-v2/registry.json. Everything starts as `planned`. Applies the approved plan
 * decisions (docs/python/curriculum-plan.md): D01 → R01 and D04 → R02, per-lesson modes for the
 * browser-limited modules, and explicit prerequisites. Re-running keeps the status of entries that
 * already exist, so authored progress is never reset by a re-import.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvRows } from '../../datasets/acquire/csv.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'src/content/python-v2/registry.json');
const dir = process.argv[2];
if (!dir) throw new Error('Usage: node scripts/python-v2/import-catalog.mjs <pack>/catalog');

function readCsv(name) {
  const [head, ...rows] = [...csvRows(fs.readFileSync(path.join(dir, name), 'utf8'))].filter(r => r.length > 1);
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const SWAP = { D01: 'R01', D04: 'R02' };
const swap = id => SWAP[id] ?? id;

const STAGES = ['Foundations', 'Collections', 'Problem Solving', 'Standard Library', 'Practical Development',
  'OOP & Professional', 'APIs & Advanced', 'Performance & Concurrency', 'Data Analysis', 'Production']
  .map((title, i) => ({ stage: i + 1, title }));

/** Lessons the browser runner can't execute as written (plan §1.2, §4.2). Keyed by module, then lesson title. */
const MODES = {
  M23: { subprocess: 'read-and-diagnose' },
  M24: { breakpoints: 'simulated' },
  M30: { 'virtual environments': 'read-and-diagnose', pyproject: 'read-and-diagnose', dependencies: 'read-and-diagnose' },
  M31: { 'HTTP requests': 'simulated', 'JSON responses': 'simulated', pagination: 'simulated', 'retries and timeouts': 'simulated', 'client architecture': 'simulated' },
  M38: { threads: 'read-and-diagnose', executors: 'read-and-diagnose', 'shared state': 'read-and-diagnose', processes: 'read-and-diagnose', 'benchmark comparisons': 'simulated' },
  M39: { 'async HTTP workflows': 'simulated' },
  M44: { Seaborn: 'read-and-diagnose' },
  M49: { Docker: 'read-and-diagnose', CI: 'read-and-diagnose' },
};
const modeOf = (module, title) => MODES[module]?.[title] ?? 'interactive';

const DATASETS = [
  { id: 'F00', title: 'Inline fixtures', kind: 'inline', licence: { status: 'ours', name: 'Runtime-owned' } },
  { id: 'R01', title: 'Runtime Market', kind: 'generated', licence: { status: 'ours', name: 'Runtime-owned synthetic data' } },
  { id: 'R02', title: 'Runtime Films', kind: 'generated', licence: { status: 'ours', name: 'Runtime-owned synthetic data' } },
  { id: 'D01', title: 'Olist E-Commerce', kind: 'external', source: 'https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce', replacedBy: 'R01', licence: { status: 'replaced', name: 'CC BY-NC-SA 4.0 (non-commercial)', note: 'Replaced by R01 (plan §12)' } },
  { id: 'D02', title: 'UCI Online Retail II', kind: 'external', source: 'https://archive.ics.uci.edu/dataset/502/online+retail+ii', licence: { status: 'cleared', name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' } },
  { id: 'D03', title: 'CFPB Consumer Complaints', kind: 'external', source: 'https://www.consumerfinance.gov/data-research/consumer-complaints/', licence: { status: 'review', name: 'US government data', note: 'Check narrative terms' } },
  { id: 'D04', title: 'MovieLens', kind: 'external', source: 'https://grouplens.org/datasets/movielens/', replacedBy: 'R02', licence: { status: 'replaced', name: 'GroupLens terms (redistribution limits)', note: 'Replaced by R02 (plan §12)' } },
  { id: 'D05', title: 'Inside Airbnb', kind: 'external', source: 'https://insideairbnb.com/get-the-data/', licence: { status: 'review', name: 'Inside Airbnb terms', note: 'Check per city' } },
  { id: 'D06', title: 'NYC Taxi Trips', kind: 'external', source: 'https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page', licence: { status: 'cleared', name: 'NYC Open Data Terms of Use', url: 'https://opendata.cityofnewyork.us/overview/#termsofuse' } },
  { id: 'D07', title: 'NOAA GHCN Daily', kind: 'external', source: 'https://www.ncei.noaa.gov/', licence: { status: 'cleared', name: 'U.S. government work (public domain)', url: 'https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C00861' } },
  { id: 'D08', title: 'USGS Earthquakes', kind: 'external', source: 'https://earthquake.usgs.gov/fdsnws/event/1/', licence: { status: 'review', name: 'US government data' } },
  { id: 'D09', title: 'Open Food Facts', kind: 'external', source: 'https://world.openfoodfacts.org/data', licence: { status: 'review', name: 'ODbL', note: 'Share-alike review' } },
  { id: 'D10', title: 'OpenAlex', kind: 'external', source: 'https://docs.openalex.org/', licence: { status: 'review', name: 'CC0', note: 'Check API terms; recorded responses only' } },
  { id: 'D11', title: 'GH Archive', kind: 'external', source: 'https://www.gharchive.org/', licence: { status: 'review', name: 'GH Archive terms', note: 'Personal-data review; minimise' } },
  { id: 'D12', title: 'Stack Exchange', kind: 'external', source: 'https://archive.org/details/stackexchange', licence: { status: 'review', name: 'CC BY-SA', note: 'Attribution' } },
  { id: 'D13', title: 'BTS Airline On-Time', kind: 'external', source: 'https://www.transtats.bts.gov/ONTIME/', licence: { status: 'cleared', name: 'U.S. government work (public domain)', url: 'https://www.bts.gov/policies-and-notices' } },
  { id: 'D14', title: 'OpenStreetMap', kind: 'external', source: 'https://planet.openstreetmap.org/', licence: { status: 'review', name: 'ODbL', note: 'Share-alike' } },
  { id: 'D15', title: 'NASA Science', kind: 'external', source: 'https://api.nasa.gov/', licence: { status: 'review', name: 'Per collection', note: 'Choose one collection first' } },
];

/** Milestone outlines from plan §6, with the approved dataset per project. */
const PROJECTS = {
  P01: { data: ['R01'], milestones: ['Browse products', 'Cart add and update', 'Totals and discounts', 'Receipt file', 'Edge cases'] },
  P02: { data: ['R02'], milestones: ['Search', 'Genre filters', 'Rating aggregates', 'Rankings', 'Report'] },
  P03: { data: ['D07'], milestones: ['Parse observations', 'Missing values', 'Summaries', 'Threshold alerts', 'Report'] },
  P04: { data: ['D02'], milestones: ['Ingest CSV', 'Reject and clean', 'Reconcile', 'Report', 'Command-line tool'] },
  P05: { data: ['D05'], milestones: ['Models', 'Availability', 'Reservations', 'Persistence with SQLite', 'Reports'] },
  P06: { data: ['D03'], milestones: ['Import', 'Assign', 'State transitions', 'Audit log', 'Reports'] },
  P07: { data: ['D10'], milestones: ['API client', 'Pagination', 'Retries and caching', 'SQLite store', 'Summaries'], mode: 'simulated' },
  P08: { data: ['D11'], milestones: ['JSONL streaming', 'Aggregates', 'Checkpoints', 'Duplicate events', 'Report'] },
  P09: { data: ['D06'], milestones: ['Read Parquet', 'Batch statistics', 'pandas vs DuckDB', 'Benchmark', 'Report'] },
  P10: { data: ['D13'], milestones: ['Validate', 'Transform', 'Checkpoint', 'Retry and replay', 'Metrics', 'Package'] },
};

const TOOLS = [
  { id: 'T01', title: 'Python Playground', phase: 1 },
  { id: 'T02', title: 'Dataset Explorer', phase: 1 },
  { id: 'T03', title: 'Database Lab', phase: 3 },
  { id: 'T04', title: 'Performance Lab', phase: 4 },
  { id: 'T05', title: 'Syntax & API Comparator', phase: 4 },
];

const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
const oldStatus = new Map();
if (previous) {
  for (const k of ['lessons', 'questions', 'projects', 'tools']) for (const e of previous[k]) oldStatus.set(e.id, e.status);
  for (const p of previous.projects) for (const m of p.milestones) oldStatus.set(m.id, m.status);
}
const status = id => oldStatus.get(id) ?? 'planned';

const lessonRows = readCsv('lessons.csv');
const modules = [];
const lessons = [];
for (const r of lessonRows) {
  let m = modules.at(-1);
  if (!m || m.id !== r.module_id) {
    m = { id: r.module_id, stage: Number(r.stage), title: r.module, lessons: [] };
    modules.push(m);
  }
  // Course order: each lesson needs the one before it (the first lesson of a module needs the previous module's last).
  const before = lessons.at(-1);
  lessons.push({
    id: r.lesson_id, module: r.module_id, title: r.lesson, status: status(r.lesson_id),
    mode: modeOf(r.module_id, r.lesson), prerequisites: before ? [before.id] : [], datasets: [swap(r.primary_dataset)],
  });
  m.lessons.push(r.lesson_id);
}

const lessonByConcept = new Map(lessons.map(l => [`${l.module}|${l.title}`, l]));
const questions = readCsv('practice_blueprint_slots.csv').map(r => {
  const lesson = lessonByConcept.get(`${r.module_id}|${r.primary_concept}`) ?? lessons.find(l => l.module === r.module_id);
  return {
    id: r.question_id, module: r.module_id, concept: r.primary_concept, format: r.format, difficulty: r.difficulty_proposal,
    slot: r.working_title, status: status(r.question_id), mode: lesson.mode, prerequisites: [lesson.id], datasets: [swap(r.dataset_id)],
  };
});

const lastLesson = mod => modules.find(m => m.id === mod).lessons.at(-1);
const projects = readCsv('projects.csv').map(r => {
  const plan = PROJECTS[r.id];
  if (!plan) throw new Error(`no plan for project ${r.id}`);
  const ms = plan.milestones.map((title, i) => {
    const id = `${r.id}.m${i + 1}`;
    return { id, title, status: status(id), mode: plan.mode ?? 'interactive', prerequisites: i ? [`${r.id}.m${i}`] : [lastLesson(r.unlock_after)], datasets: plan.data };
  });
  return { id: r.id, title: r.name, level: r.level, status: status(r.id), unlockAfter: r.unlock_after, datasets: plan.data, acceptance: r.acceptance, milestones: ms };
});

// Approved M01 benchmark (docs/python/content-rules.md). Applied after concept lookup so question
// prerequisites still find the catalogue's original lesson titles, then the titles are renamed.
const TITLE = {
  'PY-L01-02': 'printing and formatting',
  'PY-L02-01': 'assignment and input',
};
for (const l of lessons) if (TITLE[l.id]) l.title = TITLE[l.id];
const QUESTION_PATCH = {
  'PY-Q01-06': { prerequisites: ['PY-L01-02'] },
  'PY-Q01-09': { prerequisites: ['PY-L01-05'] },
  'PY-Q01-20': { format: 'debugging' },
  'PY-Q01-23': { prerequisites: ['PY-L01-05'] },
  'PY-Q02-02': { prerequisites: ['PY-L02-01'], datasets: ['R01'] },
  'PY-Q02-03': { prerequisites: ['PY-L02-01'], datasets: ['F00'] },
  'PY-Q02-06': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L02-01'], datasets: ['R01'] },
  'PY-Q02-10': { difficulty: 'medium', prerequisites: ['PY-L02-05'], datasets: ['R01'] },
  'PY-Q02-12': { prerequisites: ['PY-L02-02'], datasets: ['R01'] },
  'PY-Q02-13': { prerequisites: ['PY-L02-03'], datasets: ['F00'] },
  'PY-Q02-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L02-02'], datasets: ['R01'] },
  'PY-Q02-22': { difficulty: 'medium', prerequisites: ['PY-L02-03'], datasets: ['R01'] },
  'PY-Q02-23': { difficulty: 'medium', prerequisites: ['PY-L02-04'], datasets: ['F00'] },
  'PY-Q02-25': { format: 'code_completion', difficulty: 'hard', prerequisites: ['PY-L02-05'], datasets: ['F00'] },
  'PY-Q03-02': { prerequisites: ['PY-L03-01'], datasets: ['R01'] },
  'PY-Q03-03': { prerequisites: ['PY-L03-01'], datasets: ['F00'] },
  'PY-Q03-10': { difficulty: 'medium', prerequisites: ['PY-L03-04'], datasets: ['R01'] },
  'PY-Q03-12': { prerequisites: ['PY-L03-02'], datasets: ['R01'] },
  'PY-Q03-13': { prerequisites: ['PY-L03-02'], datasets: ['F00'] },
  'PY-Q03-15': { format: 'output_prediction', difficulty: 'medium', prerequisites: ['PY-L03-05'], datasets: ['F00'] },
  'PY-Q03-20': { difficulty: 'medium', prerequisites: ['PY-L03-03'], datasets: ['R01'] },
  'PY-Q03-22': { difficulty: 'medium', prerequisites: ['PY-L03-03'], datasets: ['R01'] },
  'PY-Q03-23': { prerequisites: ['PY-L03-04'], datasets: ['F00'] },
  'PY-Q03-25': { format: 'code_completion', difficulty: 'hard', prerequisites: ['PY-L03-05'], datasets: ['F00'] },
  'PY-Q04-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L04-01'] },
  'PY-Q04-09': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L04-04'] },
  'PY-Q04-10': { prerequisites: ['PY-L04-05'] },
  'PY-Q04-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L04-02'] },
  'PY-Q04-20': { difficulty: 'medium', prerequisites: ['PY-L04-05'] },
  'PY-Q04-22': { difficulty: 'hard', prerequisites: ['PY-L04-05'] },
  'PY-Q05-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L05-01'] },
  'PY-Q05-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L05-03'] },
  'PY-Q05-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L05-04'] },
  'PY-Q05-20': { difficulty: 'medium', prerequisites: ['PY-L05-04'] },
  'PY-Q05-22': { difficulty: 'hard', prerequisites: ['PY-L05-05'] },
  'PY-Q06-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L06-01'] },
  'PY-Q06-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L06-01'] },
  'PY-Q06-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L06-04'] },
  'PY-Q06-20': { difficulty: 'medium', prerequisites: ['PY-L06-05'] },
  'PY-Q06-22': { difficulty: 'hard', prerequisites: ['PY-L06-03'] },
  'PY-Q07-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L07-01'] },
  'PY-Q07-10': { prerequisites: ['PY-L07-05'] },
  'PY-Q07-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L07-01'] },
  'PY-Q07-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L07-04'] },
  'PY-Q07-20': { prerequisites: ['PY-L07-05'] },
  'PY-Q07-22': { difficulty: 'hard', prerequisites: ['PY-L07-04'] },
  'PY-Q08-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L08-01'] },
  'PY-Q08-10': { prerequisites: ['PY-L08-05'] },
  'PY-Q08-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L08-02'] },
  'PY-Q08-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L08-04'] },
  'PY-Q08-20': { prerequisites: ['PY-L08-05'] },
  'PY-Q08-22': { difficulty: 'hard', prerequisites: ['PY-L08-05'] },
  'PY-Q09-03': { prerequisites: ['PY-L09-03'] },
  'PY-Q09-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L09-01'] },
  'PY-Q09-10': { prerequisites: ['PY-L09-05'] },
  'PY-Q09-13': { prerequisites: ['PY-L09-03'] },
  'PY-Q09-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L09-02'] },
  'PY-Q09-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L09-04'] },
  'PY-Q09-20': { prerequisites: ['PY-L09-05'] },
  'PY-Q09-22': { difficulty: 'hard', prerequisites: ['PY-L09-04'] },
  'PY-Q10-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L10-01'] },
  'PY-Q10-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L10-01'] },
  'PY-Q10-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L10-04'] },
  'PY-Q10-22': { difficulty: 'hard', prerequisites: ['PY-L10-05'] },
  'PY-Q11-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L11-01'] },
  'PY-Q11-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L11-01'] },
  'PY-Q11-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L11-04'] },
  'PY-Q11-22': { difficulty: 'hard', prerequisites: ['PY-L11-04'] },
  'PY-Q12-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L12-01'] },
  'PY-Q12-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L12-01'] },
  'PY-Q12-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L12-04'] },
  'PY-Q12-22': { difficulty: 'hard', prerequisites: ['PY-L12-04'] },
  'PY-Q13-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L13-01'] },
  'PY-Q13-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L13-01'] },
  'PY-Q13-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L13-04'] },
  'PY-Q13-22': { difficulty: 'hard', prerequisites: ['PY-L13-05'] },
  'PY-Q14-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L14-01'] },
  'PY-Q14-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L14-01'] },
  'PY-Q14-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L14-04'] },
  'PY-Q15-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L15-01'] },
  'PY-Q15-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L15-01'] },
  'PY-Q15-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L15-04'] },
  'PY-Q16-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L16-01'] },
  'PY-Q16-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L16-01'] },
  'PY-Q16-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L16-04'] },
  'PY-Q17-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L17-01'] },
  'PY-Q17-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L17-01'] },
  'PY-Q17-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L17-04'] },
  'PY-Q18-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L18-01'] },
  'PY-Q18-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L18-01'] },
  'PY-Q18-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L18-04'] },
  'PY-Q19-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L19-01'] },
  'PY-Q19-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L19-01'] },
  'PY-Q19-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L19-04'] },
  'PY-Q20-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L20-01'] },
  'PY-Q20-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L20-01'] },
  'PY-Q20-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L20-04'] },
  'PY-Q21-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L21-01'] },
  'PY-Q21-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L21-01'] },
  'PY-Q21-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L21-04'] },
  'PY-Q22-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L22-01'] },
  'PY-Q22-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L22-01'] },
  'PY-Q22-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L22-04'] },
  'PY-Q23-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L23-01'] },
  'PY-Q23-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L23-01'] },
  'PY-Q23-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L23-04'] },
  'PY-Q24-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L24-01'] },
  'PY-Q24-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L24-01'] },
  'PY-Q24-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L24-04'] },
  'PY-Q25-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L25-01'] },
  'PY-Q25-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L25-01'] },
  'PY-Q25-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L25-04'] },
  'PY-Q26-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L26-01'] },
  'PY-Q26-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L26-01'] },
  'PY-Q26-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L26-04'] },
  'PY-Q27-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L27-01'] },
  'PY-Q27-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L27-01'] },
  'PY-Q27-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L27-04'] },
  'PY-Q28-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L28-01'] },
  'PY-Q28-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L28-01'] },
  'PY-Q28-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L28-04'] },
  'PY-Q29-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L29-01'] },
  'PY-Q29-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L29-01'] },
  'PY-Q29-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L29-04'] },
  'PY-Q30-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L30-01'] },
  'PY-Q30-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L30-01'] },
  'PY-Q30-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L30-04'] },
  'PY-Q31-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L31-01'] },
  'PY-Q31-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L31-01'] },
  'PY-Q31-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L31-04'] },
  'PY-Q32-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L32-01'] },
  'PY-Q32-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L32-01'] },
  'PY-Q32-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L32-04'] },
  'PY-Q33-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L33-01'] },
  'PY-Q33-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L33-01'] },
  'PY-Q33-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L33-04'] },
  'PY-Q34-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L34-01'] },
  'PY-Q34-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L34-01'] },
  'PY-Q34-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L34-04'] },
  'PY-Q35-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L35-01'] },
  'PY-Q35-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L35-01'] },
  'PY-Q35-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L35-04'] },
  'PY-Q36-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L36-01'] },
  'PY-Q36-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L36-01'] },
  'PY-Q36-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L36-04'] },
  'PY-Q37-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L37-01'] },
  'PY-Q37-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L37-01'] },
  'PY-Q37-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L37-04'] },
  'PY-Q38-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L38-01'] },
  'PY-Q38-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L38-01'] },
  'PY-Q38-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L38-04'] },
  'PY-Q39-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L39-01'] },
  'PY-Q39-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L39-01'] },
  'PY-Q39-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L39-04'] },
  'PY-Q40-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L40-01'] },
  'PY-Q40-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L40-01'] },
  'PY-Q40-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L40-04'] },
  'PY-Q41-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L41-01'] },
  'PY-Q41-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L41-01'] },
  'PY-Q41-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L41-04'] },
  'PY-Q42-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L42-01'] },
  'PY-Q42-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L42-01'] },
  'PY-Q42-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L42-04'] },
  'PY-Q43-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L43-01'] },
  'PY-Q43-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L43-01'] },
  'PY-Q43-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L43-04'] },
  'PY-Q44-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L44-01'] },
  'PY-Q44-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L44-01'] },
  'PY-Q44-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L44-04'] },
  'PY-Q45-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L45-01'] },
  'PY-Q45-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L45-01'] },
  'PY-Q45-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L45-04'] },
  'PY-Q46-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L46-01'] },
  'PY-Q46-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L46-01'] },
  'PY-Q46-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L46-04'] },
  'PY-Q47-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L47-01'] },
  'PY-Q47-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L47-01'] },
  'PY-Q47-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L47-04'] },
  'PY-Q48-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L48-01'] },
  'PY-Q48-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L48-01'] },
  'PY-Q48-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L48-04'] },
  'PY-Q49-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L49-01'] },
  'PY-Q49-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L49-01'] },
  'PY-Q49-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L49-04'] },
  'PY-Q50-06': { format: 'code_completion', difficulty: 'easy', prerequisites: ['PY-L50-01'] },
  'PY-Q50-16': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L50-01'] },
  'PY-Q50-19': { format: 'code_completion', difficulty: 'medium', prerequisites: ['PY-L50-04'] },
};
for (const q of questions) if (QUESTION_PATCH[q.id]) Object.assign(q, QUESTION_PATCH[q.id]);

const registry = {
  version: 1,
  stages: STAGES,
  modules,
  lessons,
  questions,
  projects,
  datasets: DATASETS,
  tools: TOOLS.map(t => ({ ...t, status: status(t.id) })),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(registry, null, 1) + '\n');
console.log(`registry: ${modules.length} modules, ${lessons.length} lessons, ${questions.length} questions, ${projects.length} projects, ${DATASETS.length} datasets, ${TOOLS.length} tools`);
