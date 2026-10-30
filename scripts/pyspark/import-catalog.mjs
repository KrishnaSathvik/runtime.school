/**
 * Build the canonical PySpark registry from the v4 planning handoff.
 *
 *   node scripts/pyspark/import-catalog.mjs ["PySpark Docs/planning"]
 *
 * Writes src/content/pyspark/registry.json. IDs are namespaced (L025 → PS-L025, owner decision 2026-10-23) and
 * everything starts as `planned`. The handoff has no prerequisites or engine needs, so they are set here
 * (docs/pyspark/plan.md §3–§5). Legacy question briefs are not imported: they are unapproved placeholders.
 * Re-running keeps the status of entries that already exist, so authored progress is never reset by a re-import.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { csvRows } from '../../datasets/acquire/csv.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(root, 'src/content/pyspark/registry.json');
const dir = path.resolve(root, process.argv[2] ?? 'PySpark Docs/planning');

function readCsv(name) {
  const [head, ...rows] = [...csvRows(fs.readFileSync(path.join(dir, name), 'utf8'))].filter(r => r.length > 1);
  return rows.map(r => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const ps = id => `PS-${id}`;
const list = s => s.split(/[,;+]/).map(x => x.trim()).filter(Boolean);

/** Lessons each lesson builds on (all earlier in course order). Proposed in docs/pyspark/plan.md §4. */
const PREREQS = {
  L001: [], L002: ['L001'], L003: ['L001'], L004: ['L003'], L005: ['L004'], L006: ['L002', 'L004'],
  L007: ['L003'], L008: ['L007'], L009: ['L008'], L010: ['L009'], L011: ['L009'], L012: ['L009'],
  L013: ['L009'], L014: ['L009'], L015: ['L009'], L016: ['L014'], L017: ['L009', 'L010'], L018: ['L014'],
  L019: ['L010', 'L017'], L020: ['L009'], L021: ['L015', 'L010'], L022: ['L017', 'L019'], L023: ['L013', 'L022'], L024: ['L023'],
  L025: ['L011'], L026: ['L025', 'L019'], L027: ['L025'], L028: ['L025', 'L017'], L029: ['L011', 'L013'], L030: ['L025', 'L020'],
  L031: ['L011'], L032: ['L031', 'L017'], L033: ['L031', 'L011', 'L010', 'L012'], L034: ['L033', 'L018'], L035: ['L033'], L036: ['L034', 'L035', 'L018'],
  L037: ['L009', 'L013', 'L010'], L038: ['L037'], L039: ['L038'], L040: ['L038'], L041: ['L039'], L042: ['L037', 'L039', 'L018'],
  L043: ['L007', 'L013', 'L011'], L044: ['L037', 'L043'], L045: ['L043'], L046: ['L013', 'L045'], L047: ['L045', 'L018'], L048: ['L043', 'L025'],
  L049: ['L005'], L050: ['L049'], L051: ['L015', 'L017'], L052: ['L051'], L053: ['L052'], L054: ['L019', 'L031', 'L033'],
  L055: ['L006'], L056: ['L055', 'L025'], L057: ['L056', 'L031'], L058: ['L057', 'L025'], L059: ['L057'], L060: ['L055'],
  L061: ['L045', 'L047'], L062: ['L061'], L063: ['L061', 'L025'], L064: ['L063', 'L033'], L065: ['L061', 'L013'], L066: ['L061', 'L047'],
  L067: ['L004', 'L037'], L068: ['L067'], L069: ['L068', 'L031', 'L018'], L070: ['L069'], L071: ['L068', 'L025', 'L070'], L072: ['L068', 'L031', 'L018'],
  L073: ['L023', 'L061'], L074: ['L073', 'L047'], L075: ['L063', 'L033'], L076: ['L023'], L077: ['L074'], L078: ['L076'],
  L079: ['L003'], L080: ['L055'], L081: ['L055'], L082: ['L074'], L083: ['L082', 'L063', 'L020'], L084: ['L081', 'L031', 'L017'],
  L085: ['L056', 'L060'], L086: ['L066'], L087: ['L070', 'L072', 'L053'], L088: ['L054'], L089: ['L052', 'L054', 'L034', 'L035', 'L025'], L090: ['L075', 'L077', 'L083'],
};

/**
 * Lessons that help but aren't needed to follow a lesson (shown as "related", never a lock). Moved here from PREREQS by
 * the P01 review (2026-10-23, docs/pyspark/plan.md §4): each concept was checked against what the lesson actually uses.
 */
const RELATED = {
  L014: ['L013'], // casting needs the column types (L008), not building StructType schemas
  L015: ['L012'], // string functions apply through select/alias (L009); withColumn is optional
  L017: ['L012'], // when/otherwise works inside select (L009) and filter (L010)
  L020: ['L011'], // dropDuplicates is taught in L020 itself; distinct() is a related idea
  L025: ['L010', 'L012'], // a join needs DataFrames and column selection (L009), not filtering or renaming
  L031: ['L010', 'L012'], // groupBy/agg with aliases needs select (L009)
};

/** URL slug from a title: "Left Semi and Left Anti Joins" → "left-semi-and-left-anti-joins". */
const slugOf = (title) => title.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** What each lesson needs from the Spark engine (plan §5). Unlisted lessons need plain DataFrames. */
const REQUIRES = {
  // L002 shows partitions and tasks on local Spark (getNumPartitions, defaultParallelism), so it runs.
  L002: 'rdd', L003: 'rdd', L005: 'rdd', L006: 'plans',
  L049: 'rdd', L050: 'rdd', L052: 'arrow', L053: 'arrow', L054: 'mllib',
  L055: 'plans', L056: 'plans', L057: 'plans', L058: 'plans', L059: 'plans', L060: 'plans',
  L061: 'delta', L062: 'delta', L063: 'delta', L064: 'delta', L065: 'delta', L066: 'delta',
  L067: 'streaming', L068: 'streaming', L069: 'streaming', L070: 'streaming', L071: 'streaming', L072: 'streaming',
  L073: 'delta', L074: 'delta', L075: 'delta', L083: 'delta',
  // L079–L081 run real spark-submit/subprocess jobs on local Spark and grade executed predict items, so they're interactive.
  L080: 'plans', L081: 'plans',
  L085: 'benchmark', L086: 'delta', L087: 'streaming', L088: 'mllib', L089: 'mllib', L090: 'delta',
};
const requiresOf = id => REQUIRES[id] ?? 'dataframe';
/** Lessons that never run code read real recorded Spark output instead (plan §5). */
const modeOf = id => (requiresOf(id) === 'none' ? 'read-and-diagnose' : 'interactive');

/**
 * Dataset changes to the v4 mapping, applied to the lesson and its question seeds. The handoff CSVs stay as supplied
 * (their hashes are in PySpark Docs/MANIFEST.json); every change is listed here and in docs/pyspark/plan.md §4.
 */
const DATASET_OVERRIDES = {
  // Owner decision 2026-10-23: the first D01 pathway creates DataFrames from our own retail data, not the Employees sample.
  L007: ['D01'],
};
const datasetsOf = (lessonId, csvValue) => (DATASET_OVERRIDES[lessonId] ?? list(csvValue)).map(ps);

const PROJECT_REQUIRES = { P06: 'benchmark', P07: 'delta', P08: 'delta', P09: 'streaming', P10: 'streaming' };

const FORMATS = {
  dataframe_coding: 'dataframe_coding',
  concept_or_trace_exercise: 'concept_or_trace',
  plan_diagnostics_or_code: 'plan_diagnostics',
  stateful_pipeline_or_code: 'stateful_pipeline',
  streaming_or_code: 'streaming',
};
const ROLES = { Foundation: 'foundation', 'Business task': 'business', 'Edge case': 'edge', Debugging: 'debugging', Integration: 'integration' };

/**
 * Datasets built as Runtime's own deterministic synthetic data (services/spark-runner/datasets/dNN_*.py). Each keeps its
 * own domain; the real public source in the handoff stays recorded as a possible later upgrade, after licence review.
 */
const BUILT = fs.readdirSync(path.join(root, 'services/spark-runner/fixtures')).filter((n) => /^PS-D\d\d$/.test(n)).map((n) => n.slice(3));

/** Tables a built dataset really has: its newest manifest's schemas (the handoff's planned names are only a plan). */
function builtTables(id) {
  const dir = path.join(root, 'services/spark-runner/fixtures', ps(id));
  const newest = fs.readdirSync(dir).filter((v) => fs.existsSync(path.join(dir, v, 'manifest.json')))
    .sort((x, y) => { const a = x.split('.').map(Number), b = y.split('.').map(Number); return a[0] - b[0] || a[1] - b[1] || a[2] - b[2]; }).at(-1);
  return Object.keys(JSON.parse(fs.readFileSync(path.join(dir, newest, 'manifest.json'), 'utf8')).schemas);
}

/** Licence state from the handoff's legal gate, unless the dataset is built as our own synthetic data. */
function licenceOf(d) {
  if (d.dataset_id === 'D01') return { status: 'ours', note: 'Runtime-owned deterministic synthetic retail data. Olist is not used.' };
  if (BUILT.includes(d.dataset_id)) return { status: 'ours', note: `Runtime-owned deterministic synthetic data. Real-source option (licence review needed first): ${d.preferred_source}.` };
  if (/^(fully )?synthetic/i.test(d.legal_gate)) return { status: 'ours', note: d.legal_gate };
  return { status: 'review', note: d.legal_gate };
}
function kindOf(d) {
  if (d.dataset_id === 'D01' || BUILT.includes(d.dataset_id) || /^synthetic/i.test(d.acquisition_model)) return 'generated';
  return /^hybrid|\+/i.test(d.acquisition_model) ? 'hybrid' : 'external';
}

const TOOLS = [
  ['T01', 'PySpark Playground', 'dataframe'],
  ['T02', 'Datasets Explorer', 'none'],
  ['T03', 'Spark SQL Lab', 'sql'],
  ['T04', 'Query Plans & Performance Lab', 'plans'],
  ['T05', 'Compare Approaches', 'dataframe'],
  ['T06', 'Pipeline & Streaming Lab', 'streaming'],
];

const lessons = readCsv('canonical_lessons_v4.csv');
const seeds = readCsv('question_seeds_v4_REQUIRES_AUTHORING.csv');
const projects = readCsv('canonical_projects_v4.csv');
const datasets = readCsv('dataset_registry_v4.csv');

const missing = lessons.filter(l => !(l.lesson_id in PREREQS)).map(l => l.lesson_id);
if (missing.length) throw new Error(`No prerequisites set for ${missing.join(', ')}`);

const old = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : null;
const kept = new Map();
if (old) for (const e of [...old.lessons, ...old.questions, ...old.projects, ...old.tools, ...old.projects.flatMap(p => p.milestones)]) kept.set(e.id, e.status);
const statusOf = id => kept.get(id) ?? 'planned';

const modules = [];
for (const l of lessons) {
  const id = ps(l.module_id);
  let m = modules.find(x => x.id === id);
  if (!m) modules.push((m = { id, title: l.module, lessons: [] }));
  m.lessons.push(ps(l.lesson_id));
}

const registry = {
  version: 1,
  modules,
  lessons: lessons.map(l => ({
    id: ps(l.lesson_id),
    module: ps(l.module_id),
    title: l.title,
    slug: slugOf(l.title),
    status: statusOf(ps(l.lesson_id)),
    mode: modeOf(l.lesson_id),
    requires: requiresOf(l.lesson_id),
    prerequisites: PREREQS[l.lesson_id].map(ps),
    related: (RELATED[l.lesson_id] ?? []).map(ps),
    datasets: datasetsOf(l.lesson_id, l.datasets),
    questions: seeds.filter(q => q.lesson_id === l.lesson_id).map(q => ps(q.question_id)),
  })),
  questions: seeds.map(q => {
    const format = FORMATS[q.proposed_grading_mode];
    const role = ROLES[q.question_role];
    if (!format || !role) throw new Error(`${q.question_id}: unknown grading mode or role`);
    return {
      id: ps(q.question_id),
      lesson: ps(q.lesson_id),
      module: ps(q.module_id),
      role,
      format,
      draftDifficulty: q.draft_difficulty.toLowerCase(),
      status: statusOf(ps(q.question_id)),
      mode: modeOf(q.lesson_id),
      requires: requiresOf(q.lesson_id),
      prerequisites: [ps(q.lesson_id)],
      datasets: datasetsOf(q.lesson_id, q.datasets),
    };
  }),
  projects: projects.map(p => ({
    id: ps(p.project_id),
    title: p.name,
    slug: slugOf(p.name),
    level: p.level.toLowerCase(),
    status: statusOf(ps(p.project_id)),
    requires: PROJECT_REQUIRES[p.project_id] ?? 'dataframe',
    datasets: list(p.datasets).map(ps),
    prerequisites: list(p.prerequisite_lessons).map(ps),
    goal: p.business_requirement,
    // A written project's outputs come from its steps (they may name the catalogue's plural outputs as real tables).
    deliverables: old?.projects.find(x => x.id === ps(p.project_id))?.milestones?.length ? old.projects.find(x => x.id === ps(p.project_id)).deliverables : list(p.expected_deliverables),
    milestones: old?.projects.find(x => x.id === ps(p.project_id))?.milestones ?? [],
  })),
  datasets: datasets.map(d => ({
    id: ps(d.dataset_id),
    title: d.domain,
    kind: kindOf(d),
    tables: BUILT.includes(d.dataset_id) ? builtTables(d.dataset_id) : list(d.planned_table_stream_names),
    licence: licenceOf(d),
    ...(!BUILT.includes(d.dataset_id) && !d.source_url.startsWith('internal://') ? { source: d.source_url } : {}),
  })),
  tools: TOOLS.map(([id, title, requires]) => ({ id: ps(id), title, status: statusOf(ps(id)), requires })),
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, OUT)}: ${registry.modules.length} modules, ${registry.lessons.length} lessons, ${registry.questions.length} questions, ${registry.projects.length} projects, ${registry.datasets.length} datasets, ${registry.tools.length} tools`);
