import { describe, it, expect } from 'vitest';
import { pythonSectionHrefs } from '@/features/py/section-hrefs';
import { pythonLessons, pythonLessonHref } from '@/content/python';
import { pythonQuestions, pythonQuestionHref } from '@/content/python/practice';
import { pythonProjects, journeyHref } from '@/content/python/journeys';
import { normalizePyProgress } from '@/lib/python-progress';

describe('Python follows SQL section entry rules', () => {
  it('starts at the first lesson, question and project brief', () => {
    expect(pythonSectionHrefs(normalizePyProgress({}))).toEqual({learn:pythonLessonHref(pythonLessons[0].slug), practice:pythonQuestionHref(pythonQuestions[0].slug), projects:journeyHref(pythonProjects[0])});
  });
  it('skips mastered lessons but keeps assisted work available for mastery', () => {
    const first = pythonLessons[0];
    const rec = {challenges:Object.fromEntries(first.challenges.map(c => [c.id,{solved:true}])),quiz:{passed:true}};
    const state = normalizePyProgress({lessons:{[first.ref]:rec}});
    expect(pythonSectionHrefs(state).learn).toBe(pythonLessonHref(pythonLessons[1].slug));
    state.lessons[first.ref].challenges[first.challenges[0].id].solved = false;
    expect(pythonSectionHrefs(state).learn).toBe(pythonLessonHref(first.slug));
  });
  it('resumes recent practice and advances past assisted answers', () => {
    const q = pythonQuestions[4];
    const state = normalizePyProgress({items:{[q.ref]:{updatedAt:10}}});
    expect(pythonSectionHrefs(state).practice).toBe(pythonQuestionHref(q.slug));
    const passed = normalizePyProgress({items:{[q.ref]:{updatedAt:10,challenges:{answer:{assisted:true}}}}});
    expect(pythonSectionHrefs(passed).practice).toBe(pythonQuestionHref(pythonQuestions[5].slug));
  });
  it('resumes the most recent project at the next unpassed milestone', () => {
    const p = pythonProjects[1];
    const state = normalizePyProgress({items:{[p.ref]:{updatedAt:20,challenges:{[p.stages[0].id]:{passes:1,assisted:true}}},[pythonProjects[0].ref]:{updatedAt:10}}});
    expect(pythonSectionHrefs(state).projects).toBe(`${journeyHref(p)}?stage=${p.stages[1].id}`);
  });
  it('returns completed work to a reviewable destination', () => {
    const p = pythonProjects[0];
    const state = normalizePyProgress({items:{[p.ref]:{updatedAt:20,challenges:Object.fromEntries(p.stages.map(s => [s.id,{passes:1}]))},...Object.fromEntries(pythonQuestions.map(q => [q.ref,{challenges:{answer:{solved:true}}}]))}});
    expect(pythonSectionHrefs(state).projects).toBe(journeyHref(p));
    expect(pythonSectionHrefs(state).practice).toBe(pythonQuestionHref(pythonQuestions[0].slug));
  });
});
