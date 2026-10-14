import { describe, expect, it } from 'vitest';
import { pythonJourneys, pythonCases, pythonProjects } from '@/content/python/journeys';
import { validateGraded } from './helpers/python-inventory';
import { runFast } from './helpers/python-fast';

it('provides two cases and six cumulative projects with stable identities', () => {
  expect(pythonCases).toHaveLength(2);
  expect(pythonProjects).toHaveLength(6);
  expect(new Set(pythonJourneys.flatMap(j => [j.ref, ...j.stages.map(s => s.ref)])).size).toBe(46);
  for (const j of pythonJourneys) {
    expect(j.overview.length).toBeGreaterThan(100);
    j.stages.slice(1).forEach((s, i) => expect(s.starter).toBe(j.stages[i].answer));
  }
});
for (const j of pythonJourneys) describe(j.title, () => {
  for (const stage of j.stages) it(stage.title, async () => {
    await validateGraded(stage.ref, stage);
  }, 600000);
  it('the complete reference exports actual deliverable files', async () => {
    const r = await runFast(j.stages.at(-1)!.answer, { files: j.files, packages: j.packages });
    expect(r.status).toBe('ok');
    expect('files' in r && r.files?.some(f => /\.(json|csv|txt)$/.test(f.path) && !f.truncated)).toBe(true);
  }, 600000);
});
