import {it,expect} from 'vitest';
import {bankQuestions,bankSeed} from '@/content/question-bank';
import {lessons,lessonFixture} from '@/content';
import {parseSchema} from '@/engine/explain';
import {openSeed} from '../helpers/canonical';
/** The schema panel and autocomplete see every overlay table and view with SQLite's exact columns. */
it('infers overlay views and derived tables exactly as SQLite creates them',async()=>{
 const bad:string[]=[];
 const items=[...bankQuestions.filter(q=>q.setupSql).map(q=>({id:q.id,seed:bankSeed(q)})),...lessons.filter(l=>l.setupSql).map(l=>({id:'L'+l.id,seed:lessonFixture(l).seed}))];
 for(const it of items){const parsed=parseSchema(it.seed);const db=await openSeed(it.seed);
  try{const objs=db.exec("SELECT name FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'")[0].values.map((v:unknown[])=>String(v[0]));
   for(const o of objs){const real=db.exec(`SELECT name FROM pragma_table_info('${o}')`)[0]?.values.map((v:unknown[])=>String(v[0]))??[];const got=parsed[o.toLowerCase()];if(JSON.stringify(got)!==JSON.stringify(real))bad.push(`${it.id} ${o}: parsed ${JSON.stringify(got)} real ${JSON.stringify(real)}`);}
  }finally{db.close();}}
 expect(items.length).toBeGreaterThan(20);expect(bad).toEqual([]);
}, 120000);

/** Every table a lesson or question shows has sample rows and column names: base tables from the dataset, scenario tables from the generated previews. */
it('every table shown in Learn and Practice has a small preview with columns', async () => {
  const { learningDataset } = await import('@/data/datasets/learning');
  const contexts = (await import('@/content/task-context.json')).default as Record<string, { tables: string[] }[]>;
  const overlay = (await import('@/content/lesson-previews.json')).default as unknown as { lessons: Record<string, number>; overlays: Record<string, { columns: unknown[]; result: { values: unknown[] } }>[] };
  const inputs = (await import('@/content/question-bank/input-previews.json')).default as Record<string, Record<string, { result: { columns: string[]; values: unknown[] } }>>;
  const { parseSchemaDetailed } = await import('@/engine/explain');
  const missing: string[] = [];
  for (const l of lessons) {
    const base = learningDataset(l.datasetRef as Parameters<typeof learningDataset>[0]).previews;
    const extra = overlay.overlays[overlay.lessons[l.id]] ?? {};
    for (const t of new Set(contexts[l.id].flatMap((c) => c.tables))) {
      const p = base[t] ?? extra[t];
      if (!p || !p.columns.length || p.result.values.length > 20) missing.push(`lesson ${l.id} ${t}`);
    }
  }
  for (const q of bankQuestions) {
    for (const t of q.tables) {
      const columns = learningDataset(q.datasetRef as Parameters<typeof learningDataset>[0]).previews[t]?.columns ?? parseSchemaDetailed(bankSeed(q))[t];
      const sample = inputs[q.id]?.[t];
      if (!columns?.length || !sample || sample.result.values.length > 20) missing.push(`${q.id} ${t}`);
    }
  }
  expect(missing).toEqual([]);
}, 120000);
